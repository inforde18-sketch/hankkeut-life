const section = document.querySelector('[data-comments]');

if (section) {
  const form = section.querySelector('form');
  const list = section.querySelector('ol');
  const listStatus = section.querySelector('[data-list-status]');
  const submitStatus = section.querySelector('[data-submit-status]');
  const submit = form.querySelector('button');
  const url = '/api/comments?article=' + encodeURIComponent(section.dataset.comments);
  const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });
  const reportPanel = section.querySelector('#report-guide');
  const reportForm = reportPanel?.querySelector('form');
  let commentTarget = '';
  let lastReport;
  let lastSubmission;

  function openReport(id = '') {
    if (!reportForm) return;
    commentTarget = id;
    reportForm.querySelector('[data-report-target]').textContent = id ? '신고 대상: 선택한 댓글' : '신고 대상: 이 글';
    reportForm.elements.reason.value = id ? '댓글 문제' : '내용 오류';
    reportForm.querySelector('[data-report-status]').textContent = '';
    reportPanel.open = true;
    reportForm.querySelector('[name="reason"]').focus();
  }

  if (reportForm) {
    reportPanel.hidden = false;
    reportPanel.addEventListener('toggle', () => {
      if (reportPanel.open) return;
      commentTarget = '';
      reportForm.querySelector('[data-report-target]').textContent = '신고 대상: 이 글';
      reportForm.elements.reason.value = '내용 오류';
    });
    document.querySelector('[data-open-report]')?.addEventListener('click', event => { event.preventDefault(); openReport(); });
    reportForm.addEventListener('submit', async event => {
      event.preventDefault();
      const button = reportForm.querySelector('button');
      const status = reportForm.querySelector('[data-report-status]');
      if (button.disabled) return;
      const { reason, note, website } = Object.fromEntries(new FormData(reportForm));
      const data = { reason, note, website, commentId: commentTarget };
      const key = JSON.stringify(data);
      if (lastReport?.key !== key) lastReport = { key, id: crypto.randomUUID() };
      button.disabled = true;
      status.textContent = '신고를 보내는 중입니다…';
      try {
        const response = await fetch(url + '&report=1', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, id: lastReport.id }),
        });
        status.textContent = (await response.json()).message;
        if (response.ok) reportForm.elements.note.value = '';
      } catch {
        status.textContent = '접수 결과를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
      } finally {
        button.disabled = false;
      }
    });
  }

  async function refresh() {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw Error('Comments unavailable');
      const { comments } = await response.json();
      list.replaceChildren(...comments.map((comment) => {
        const row = document.createElement('li');
        const name = document.createElement('strong');
        const time = document.createElement('time');
        const text = document.createElement('p');
        const date = new Date(comment.created_at * 1000);
        name.textContent = comment.nickname;
        time.dateTime = date.toISOString();
        time.textContent = dateFormat.format(date);
        text.textContent = comment.body;
        row.append(name, time, text);
        if (reportForm && comment.id) {
          const report = document.createElement('button');
          report.type = 'button';
          report.className = 'comment-report';
          report.textContent = '댓글 신고';
          report.addEventListener('click', () => openReport(comment.id));
          row.append(report);
        }
        return row;
      }));
      listStatus.textContent = comments.length ? '최근 댓글' : '아직 댓글이 없습니다.';
    } catch {
      listStatus.textContent = '댓글을 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요.';
    }
  }

  form.hidden = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const fields = new FormData(form);
    const content = {
      nickname: fields.get('nickname'),
      body: fields.get('body'),
      website: fields.get('website'),
    };
    const key = JSON.stringify(content);
    if (lastSubmission?.key !== key) lastSubmission = { key, id: crypto.randomUUID() };
    submit.disabled = true;
    submitStatus.textContent = '등록하는 중입니다…';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...content, id: lastSubmission.id }),
      });
      const result = await response.json();
      submitStatus.textContent = result.message;
      if (response.ok) {
        form.reset();
        lastSubmission = undefined;
        await refresh();
      }
    } catch {
      submitStatus.textContent = '등록 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    } finally {
      submit.disabled = false;
    }
  });
  refresh();
}
