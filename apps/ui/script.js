(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const apiBase = () => $('#apiBase')?.value.trim().replace(/\/$/, '') || '';
  const escapeHtml = (str = '') =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const state = {
    currentStep: 1,
    profile: null,
    roleRecommendations: [],
    jobs: [],
    es: null,
    currentJD: null,
    sessionId: null, // 用于跟踪当前搜索会话
  };

  // ============================================
  // STEP NAVIGATION (The Free Way)
  // ============================================
  function goToStep(step) {
    if (step < 0 || step > 4) return;
    
    const track = $('#carouselTrack');
    const cards = $$('.carousel-card');
    const backBtn = $('#floatingBackBtn');
    const nextBtn = $('#floatingNextBtn');
    const hero = $('.hero');

    state.currentStep = step;
    track.setAttribute('data-current', step);

    // 标准单卡激活逻辑
    cards.forEach((card) => {
      const cardStep = parseInt(card.getAttribute('data-step'));
      card.classList.toggle('active', cardStep === step);
    });

    if (hero) hero.style.opacity = step === 0 ? '0' : '1';

    // 导航按钮
    backBtn.style.display = (step > 0) ? 'flex' : 'none'; 
    nextBtn.style.display = (step < 4) ? 'flex' : 'none';
  }

  function initStepNavigation() {
    $('#floatingBackBtn')?.addEventListener('click', () => goToStep(state.currentStep - 1));
    $('#floatingNextBtn')?.addEventListener('click', () => goToStep(state.currentStep + 1));
    $('#startJourney')?.addEventListener('click', () => goToStep(1));
  }

  // ============================================
  // TOAST
  // ============================================
  function showToast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ============================================
  // STEP 1: PROFILE
  // ============================================
  async function analyzeProfile() {
    const freeText = $('#freeText').value.trim();
    const resumeFile = $('#resumeFile').files[0];
    const status = $('#analyzeStatus');
    const btn = $('#analyzeProfile');

    if (!freeText && !resumeFile) { showToast('请输入描述或上传简历'); return; }

    btn.disabled = true;
    status.textContent = '分析中...';

    try {
      let result;
      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        const response = await fetch(`${apiBase()}/profile/analyze-upload`, { method: 'POST', body: formData });
        result = await response.json();
        
        // 保存文件信息，分析后保持显示状态
        const fileName = resumeFile.name;
        setTimeout(() => {
          $('#dropzone').classList.add('file-selected');
          $('#dropzoneText').textContent = fileName;
        }, 100);
      } else {
        const response = await fetch(`${apiBase()}/profile/analyze`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: freeText }),
        });
        result = await response.json();
      }

      state.profile = result.profile || result;
      renderProfile(state.profile);
      status.textContent = '分析完成 ✓';
      showToast('画像分析成功');
    } catch (e) {
      status.textContent = '分析失败';
      showToast('服务暂时不可用');
      console.error('分析错误:', e);
    } finally {
      btn.disabled = false;
    }
  }

  function renderProfile(profile) {
    const card = $('#profileResultCard');
    const content = $('#profileResultContent');
    let html = '<div class="profile-display">';
    
    // Header
    html += `<h3>${escapeHtml(profile.name)}</h3>`;
    if (profile.contact) html += `<p class="muted">${escapeHtml(profile.contact)}</p>`;
    
    // Summary
    if (profile.summary) {
      html += `<span class="section-title">个人简介</span>`;
      html += `<p style="line-height:1.6; color:var(--text-main); font-size:15px;">${escapeHtml(profile.summary)}</p>`;
    }
    
    // Education
    if (profile.education?.length) {
      html += `<span class="section-title">教育背景</span>`;
      profile.education.forEach(edu => {
        const period = [edu.start, edu.end].filter(Boolean).join(' - ');
        html += `
          <div class="profile-item">
            <div class="item-head">
              <h4>${escapeHtml(edu.school)}</h4>
              ${period ? `<span class="date">${escapeHtml(period)}</span>` : ''}
            </div>
            <div class="sub">${escapeHtml(edu.degree || '')} ${edu.major ? `· ${escapeHtml(edu.major)}` : ''}</div>
          </div>
        `;
      });
    }

    // Experience
    if (profile.experience?.length) {
      html += `<span class="section-title">工作经历</span>`;
      profile.experience.forEach(exp => {
        const period = [exp.start, exp.end].filter(Boolean).join(' - ');
        html += `
          <div class="profile-item">
            <div class="item-head">
              <h4>${escapeHtml(exp.company)}</h4>
              ${period ? `<span class="date">${escapeHtml(period)}</span>` : ''}
            </div>
            <div class="sub">${escapeHtml(exp.role || '')}</div>
            ${exp.bullets?.length ? `
              <ul>
                ${exp.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      });
    }
    
    // Skills
    if (profile.skills?.length) {
      html += `<span class="section-title">核心技能</span>`;
      html += `<div style="display:flex; flex-wrap:wrap; gap:8px;">`;
      profile.skills.forEach(s => html += `<span class="skill-tag">${escapeHtml(s)}</span>`);
      html += `</div>`;
    }

    html += '</div>';
    content.innerHTML = html;
    card.classList.add('show');
  }

  // ============================================
  // STEP 2: RECOMMENDATIONS
  // ============================================
  async function recommendRoles() {
    if (!state.profile) { showToast('请先在第一步完成画像'); return; }
    const btn = $('#roleRecommendBtn');
    const status = $('#roleRecommendStatus');
    btn.disabled = true;
    status.textContent = '匹配中...';

    try {
      const response = await fetch(`${apiBase()}/profile/recommend-roles`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: state.profile }),
      });
      const data = await response.json();
      const recs = data.role_recommendations || data.recommendations || [];
      state.roleRecommendations = recs;
      
      $('#roleRecommendations').innerHTML = recs.map((r, i) => `
        <div class="role-card">
          <div style="font-size:18px; font-weight:700; margin-bottom:10px;">${i+1}. ${escapeHtml(r.title || r.role)}</div>
          <p style="color:var(--text-sub); font-size:14px;">${escapeHtml(r.reason)}</p>
          <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap;">
            ${(r.match_keywords || []).map(k => `<span class="badge" style="background:rgba(0,113,227,0.1); color:var(--accent);">${escapeHtml(k)}</span>`).join('')}
          </div>
        </div>
      `).join('');

      status.textContent = '完成 ✓';
    } catch (e) {
      status.textContent = '失败';
    } finally {
      btn.disabled = false;
    }
  }

  // ============================================
  // STEP 3: SEARCH
  // ============================================
  async function startJobSearch(isContinue = false) {
    const title = $('#titles').value.trim();
    if (!title) { showToast('请输入职位'); return; }

    const jobsEl = $('#jobs');
    const progress = $('#progress');
    const startBtn = $('#startStream');
    const continueBtn = $('#continueStream');
    
    // 如果是新搜索，生成新的 session_id 并清空结果
    if (!isContinue) {
      state.sessionId = 'search-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      state.jobs = [];
      jobsEl.innerHTML = '';
      console.log('🆕 新搜索会话:', state.sessionId);
    } else {
      console.log('🔄 继续搜索会话:', state.sessionId);
    }
    
    startBtn.disabled = true;
    continueBtn.disabled = true;
    progress.innerHTML = '<div class="spinner"></div><span>正在为您实时检索...</span>';

    const linkedinValue = parseInt($('#linkedinCount').value) || 0;
    const seekValue = parseInt($('#seekCount').value) || 0;
    const limitValue = parseInt($('#totalLimit').value) || 10;
    
    console.log('🔍 搜索参数:', { 
      titles: title, 
      linkedin: linkedinValue, 
      seek: seekValue, 
      limit: limitValue,
      isContinue: isContinue,
      sessionId: state.sessionId,
      excludeCount: state.jobs.length
    });

    const params = new URLSearchParams({
      session_id: state.sessionId || '',
      titles: title,
      locations: $('#locations').value || 'AU',
      limit: limitValue,
      seek: seekValue,
      linkedin: linkedinValue
    });

    console.log('📡 API URL:', `${apiBase()}/jobs/stream?${params}`);
    const es = new EventSource(`${apiBase()}/jobs/stream?${params}`);
    state.es = es;

    es.addEventListener('job', (e) => {
      const job = JSON.parse(e.data);
      
      // 将职位添加到 state.jobs
      state.jobs.push(job);
      
      const card = document.createElement('div');
      card.className = 'job-card-premium';
      const sourceLabel = job.source === 'seek' ? 'Seek' : 'LinkedIn';
      const sourceClass = job.source === 'seek' ? 'source-seek' : 'source-linkedin';
      const jobUrl = job.jd_url || job.url || '';
      
      card.innerHTML = `
        <div class="job-card-main">
          <div class="job-header-row">
            <span class="job-source ${sourceClass}">${sourceLabel}</span>
            <div class="job-title">${escapeHtml(job.title)}</div>
          </div>
          <div class="job-meta">${escapeHtml(job.company)} · ${escapeHtml(job.location)}</div>
          
          <div class="job-actions-grid">
            <button class="btn small primary" onclick="window.open('${jobUrl}')">打开链接</button>
            <button class="btn small outline" onclick="window.analyzeJD('${jobUrl}')">分析 JD</button>
            <button class="btn small outline" onclick="window.matchJob('${jobUrl}')">匹配程度</button>
            <button class="btn small accent-btn" onclick="window.generateTailored('${jobUrl}')">生成简历</button>
          </div>
        </div>
      `;
      jobsEl.appendChild(card);
    });

    es.addEventListener('end', () => { 
      es.close(); 
      startBtn.disabled = false; 
      continueBtn.disabled = false;
      progress.innerHTML = `<span>搜索完成 ✓ (已显示 ${state.jobs.length} 个职位)</span>`; 
    });
    es.onerror = () => { 
      es.close(); 
      startBtn.disabled = false; 
      continueBtn.disabled = false;
      progress.innerHTML = '<span>搜索异常，请刷新重试</span>';
    };
  }

  // ============================================
  // JOB ACTIONS (分析、匹配、生成)
  // ============================================
  window.analyzeJD = async (url) => {
    showToast('正在抓取并分析 JD...');
    try {
      const response = await fetch(`${apiBase()}/jd/fetch`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_url: url, render: false })
      });
      const data = await response.json();
      showToast('JD 分析完成 ✓');
      console.log('📄 JD 详情:', data.jd);
      
      // 在控制台显示关键信息
      const jd = data.jd;
      console.log(`职位: ${jd.title || '未知'}`);
      console.log(`公司: ${jd.company || '未知'}`);
      console.log(`职责 (${jd.responsibilities?.length || 0}条):`, jd.responsibilities);
      console.log(`要求 (${jd.requirements?.length || 0}条):`, jd.requirements);
    } catch (e) { 
      console.error('JD 抓取失败:', e);
      showToast('JD 抓取失败'); 
    }
  };

  window.matchJob = async (url) => {
    if (!state.profile) { showToast('请先完成个人画像'); return; }
    showToast('正在抓取 JD 并匹配...');
    try {
      // 第一步：抓取 JD
      const jdResponse = await fetch(`${apiBase()}/jd/fetch`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_url: url, render: false })
      });
      const jdData = await jdResponse.json();
      
      // 第二步：进行匹配
      const matchResponse = await fetch(`${apiBase()}/matching/match`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: state.profile, jd: jdData.jd })
      });
      const matchData = await matchResponse.json();
      
      // 显示匹配结果
      let html = `
        <div class="match-score-circle">
          <div class="match-badge">${matchData.score}%</div>
          <div class="match-label">匹配度</div>
        </div>
        <div class="match-details-scroll">
      `;
      
      if (matchData.reasons?.length) {
        html += `
          <div class="match-section">
            <strong>优势:</strong>
            <ul>${matchData.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          </div>
        `;
      }
      if (matchData.gaps?.length) {
        html += `
          <div class="match-section">
            <strong>差距:</strong>
            <ul>${matchData.gaps.map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul>
          </div>
        `;
      }
      html += `</div>`; // 关闭 match-details-scroll
      
      $('#matchResult').innerHTML = html;
      showToast(`匹配完成: ${matchData.score}%`);
    } catch (e) { 
      console.error('匹配失败:', e);
      showToast('匹配失败'); 
    }
  };

  window.generateTailored = async (url) => {
    if (!state.profile) { showToast('请先完成个人画像'); return; }
    showToast('正在抓取 JD...');
    goToStep(4);
    
    try {
      // 第一步：抓取 JD
      const jdResponse = await fetch(`${apiBase()}/jd/fetch`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_url: url, render: false })
      });
      const jdData = await jdResponse.json();
      state.currentJD = jdData.jd; // 保存当前 JD
      
      showToast('正在生成定制简历...');
      
      // 第二步：生成简历
      const renderResponse = await fetch(`${apiBase()}/resume/preview`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profile: state.profile, 
          jd: state.currentJD,
          template_id: 'resume-ats-en',
          language: 'en',
          polish: true
        })
      });
      const renderData = await renderResponse.json();
      
      $('#preview').srcdoc = renderData.html;
      $('#editResume').disabled = false;
      showToast('定制简历生成成功 ✓');
    } catch (e) { 
      console.error('生成失败:', e);
      showToast('生成失败，请重试'); 
    }
  };

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    initStepNavigation();
    goToStep(0);

    $('#analyzeProfile')?.addEventListener('click', analyzeProfile);
    $('#roleRecommendBtn')?.addEventListener('click', recommendRoles);
    $('#startStream')?.addEventListener('click', () => startJobSearch(false));
    $('#continueStream')?.addEventListener('click', () => startJobSearch(true));
    
    $('#closeProfileCard')?.addEventListener('click', () => $('#profileResultCard').classList.remove('show'));
    
    // --- 编辑画像逻辑 ---
    $('#editProfileInCard')?.addEventListener('click', () => {
      if (!state.profile) return;
      const p = state.profile;
      $('#editName').value = p.name || '';
      $('#editContact').value = p.contact || '';
      $('#editLocation').value = p.location || '';
      $('#editSkills').value = (p.skills || []).join(', ');
      $('#editSummary').value = p.summary || '';
      
      // 简单处理教育和工作经历的展示
      $('#editEducation').value = (p.education || []).map(e => `${e.school}|${e.degree || ''}|${e.major || ''}|${e.start || ''}|${e.end || ''}`).join('\n');
      $('#editExperience').value = (p.experience || []).map(e => `${e.company}|${e.role || ''}|${e.start || ''}|${e.end || ''}`).join('\n');
      
      $('#profileEditModal').classList.remove('hidden');
    });

    $('#closeProfileModal')?.addEventListener('click', () => $('#profileEditModal').classList.add('hidden'));

    $('#saveProfile')?.addEventListener('click', () => {
      state.profile.name = $('#editName').value;
      state.profile.contact = $('#editContact').value;
      state.profile.location = $('#editLocation').value;
      state.profile.summary = $('#editSummary').value;
      state.profile.skills = $('#editSkills').value.split(',').map(s => s.trim()).filter(Boolean);
      
      // 解析回结构化数据
      state.profile.education = $('#editEducation').value.split('\n').filter(Boolean).map(line => {
        const [school, degree, major, start, end] = line.split('|');
        return { school, degree, major, start, end };
      });
      state.profile.experience = $('#editExperience').value.split('\n').filter(Boolean).map(line => {
        const [company, role, start, end] = line.split('|');
        return { company, role, start, end, bullets: [] }; // 简易保存，清空 bullets
      });

      renderProfile(state.profile);
      $('#profileEditModal').classList.add('hidden');
      showToast('画像更新成功');
    });

    $('#clearProfile')?.addEventListener('click', () => {
      state.profile = null;
      $('#freeText').value = '';
      $('#resumeFile').value = '';
      $('#dropzone').classList.remove('file-selected');
      $('#profileResultCard').classList.remove('show');
    });

    const dropzone = $('#dropzone');
    const fileInput = $('#resumeFile');
    dropzone.onclick = () => fileInput.click();
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        dropzone.classList.add('file-selected');
        $('#dropzoneText').textContent = file.name;
        
        // 文件选择后自动触发分析
        showToast('检测到简历文件，开始自动分析...');
        await analyzeProfile();
      }
    };

    // ============================================
    // STEP 4: RESUME ACTIONS
    // ============================================
    $('#downloadDocx')?.addEventListener('click', async () => {
      if (!state.profile) { showToast('请先生成简历'); return; }
      showToast('正在生成 DOCX...');
      try {
        const response = await fetch(`${apiBase()}/resume/file/docx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            profile: state.profile, 
            jd: state.currentJD || null,
            template_id: 'resume-ats-en',
            language: 'en',
            polish: true
          })
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.profile.name || 'resume'}_CV.docx`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('DOCX 下载成功 ✓');
      } catch (e) {
        console.error('DOCX 生成失败:', e);
        showToast('DOCX 生成失败');
      }
    });

    $('#downloadPdf')?.addEventListener('click', async () => {
      if (!state.profile) { showToast('请先生成简历'); return; }
      showToast('正在生成 PDF...');
      try {
        const response = await fetch(`${apiBase()}/resume/file/pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            profile: state.profile, 
            jd: state.currentJD || null,
            template_id: 'resume-ats-en',
            language: 'en',
            polish: true
          })
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.profile.name || 'resume'}_CV.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('PDF 下载成功 ✓');
      } catch (e) {
        console.error('PDF 生成失败:', e);
        showToast('PDF 生成失败');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
