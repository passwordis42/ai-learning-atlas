import { useState } from 'react';
import { ArrowRight, BookOpen, Check, ClipboardList, Clock3, Download, FileText, MessageCircle, Save } from 'lucide-react';

function downloadExercise(csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tickets.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Reflection({ lesson, reflection, setReflection }) {
  const [rows, setRows] = useState(reflection?.rows ?? '');
  const [reason, setReason] = useState(reflection?.reason ?? '');
  const [evidence, setEvidence] = useState(reflection?.evidence ?? '');
  const valid = rows !== '' && reason.trim() && evidence.trim();

  function save(event) {
    event.preventDefault();
    if (valid) setReflection({ rows: Number(rows), reason: reason.trim(), evidence: evidence.trim() });
  }

  return (
    <form className="lesson-card panel reflection" onSubmit={save}>
      <div className="lesson-section-title"><ClipboardList size={21} /><h2>先交自己的判断</h2></div>
      <p>看着上面的 CSV 手算一遍。按规则预测保留几条，并指出被删除的是哪些记录。</p>
      <label>我预测保留的记录数 <input type="number" min="0" max="10" step="1" required value={rows} onChange={(event) => setRows(event.target.value)} /></label>
      <label>我的判断理由 <textarea rows={2} required maxLength={500} value={reason} placeholder="例如，先检查两列是否都空，再检查整行是否重复。" onChange={(event) => setReason(event.target.value)} /></label>
      <label>我用到的证据 <textarea rows={2} required maxLength={650} value={evidence} placeholder="写下几条具体记录或它们所在的数据行。" onChange={(event) => setEvidence(event.target.value)} /></label>
      <button className="action primary" type="submit" disabled={!valid}><Save size={17} />保存判断，再打开反馈</button>
      <p className="fineprint" role="status">{reflection ? '判断已保存在此浏览器。你可以打开核对结果或 AI 学伴。' : '这一份学习记录保存在当前浏览器。'}</p>
      {reflection && (
        <details className="review-box">
          <summary>核对自己的计算</summary>
          <p><b>你的预测</b>　{reflection.rows} 条。{reflection.rows === lesson.expectedRows ? '和练习预期一致。' : '请对照空记录和重复记录，再数一遍。'}</p>
          <p>{lesson.expectedSummary}</p>
        </details>
      )}
    </form>
  );
}

export default function DayOne({ lesson, checklist, setChecklist, done, setDone, reflection, setReflection, scopeConfirmed, setScopeConfirmed }) {
  const allChecked = lesson.checklist.every((_, index) => checklist.includes(index));

  function checkItem(index) {
    setChecklist((old) => old.includes(index) ? old.filter((value) => value !== index) : [...old, index]);
    if (done) setDone(false);
  }

  return (
    <>
      <div className="hero lesson-hero">
        <div className="hero-meta"><span className="label-chip">阶段 1 · 第 1 周 · 第一天</span><span className="time-note"><Clock3 size={16} />约 {lesson.minutes} 分钟</span></div>
        <h1>{lesson.title}</h1>
        <p>{lesson.objective}</p>
      </div>
      <div className="lesson-layout">
        <div className="lesson-body">
          <section className="lesson-card panel">
            <div className="lesson-section-title"><BookOpen size={21} /><h2>先认识三个概念</h2></div>
            <div className="concept-grid">
              {lesson.concepts.map((concept) => <article key={concept.title}><h3>{concept.title}</h3><p>{concept.body}</p><p className="example">{concept.example}</p></article>)}
            </div>
          </section>
          <section className="lesson-card panel" id="exercise">
            <div className="lesson-section-title"><FileText size={21} /><h2>实验数据与处理规则</h2></div>
            <p>处理顺序是先删整行为空的记录，再按两列内容判断整行重复。每组重复只保留第一次，保持原来的行序。CSV 表头不计入记录数。</p>
            <div className="code-frame"><div><span>tickets.csv</span><button className="action small-action" onClick={() => downloadExercise(lesson.csv)}><Download size={15} />下载样本</button></div><pre><code>{lesson.csv.trimEnd()}</code></pre></div>
          </section>
          <Reflection lesson={lesson} reflection={reflection} setReflection={setReflection} />
          <section className="lesson-card panel">
            <div className="lesson-section-title"><MessageCircle size={21} /><h2>请 AI 实现，再亲手验证</h2></div>
            <ol className="lesson-steps">
              {lesson.steps.map((step) => <li key={step.title}><div><h3>{step.title}</h3><span>{step.minutes} 分钟</span></div><p>{step.body}</p></li>)}
            </ol>
            {reflection ? (
              <details className="review-box">
                <summary>查看委托范围与规则，确认后使用 AI</summary>
                <pre className="prompt-text">{lesson.prompt}</pre>
                <label className="scope-check"><input type="checkbox" checked={scopeConfirmed} onChange={(event) => setScopeConfirmed(event.target.checked)} />我确认输入样本、清洗规则和单独保存的输出文件。</label>
                {scopeConfirmed && <a href="#tutor" className="action primary">去 AI 学伴 <ArrowRight size={17} /></a>}
              </details>
            ) : <p className="inline-note">保存你的判断、理由和证据之后，委托说明与 AI 学伴就会开放。</p>}
            <h3 className="review-question">{lesson.reviewQuestion}</h3>
            {reflection && <details className="review-box"><summary>核对思路</summary><p>{lesson.reviewAnswer}</p></details>}
          </section>
        </div>
        <aside className="lesson-aside">
          <section className="lesson-card panel lesson-checklist">
            <h2>完成清单</h2>
            <p>每完成一项，就勾选并保留对应证据。</p>
            {lesson.checklist.map((label, index) => <label key={label}><input type="checkbox" checked={checklist.includes(index)} onChange={() => checkItem(index)} />{label}</label>)}
            <button className="action primary" type="button" disabled={!reflection || !allChecked} onClick={() => setDone(!done)}>
              <Check size={17} />{done ? '第一天已完成 · 取消' : '标记第一天已完成'}
            </button>
            <p className="fineprint">建议保留原始 CSV、清洗后的 CSV，以及规则变更前后的运行结果。</p>
          </section>
          {lesson.resources?.length > 0 && (
            <section className="lesson-card panel lesson-resources">
              <h2>今天的参考资料</h2>
              {lesson.resources.map(({ title, url }) => <a key={url} href={url} target="_blank" rel="noreferrer">{title} <ArrowRight size={14} /></a>)}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
