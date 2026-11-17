import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Copy, Download } from 'lucide-react';
import './lesson-guide.css';

const guideSteps = [
  { title: '认识 CSV', task: '先分清表头、空记录和重复记录，再去看真实样本。', minutes: 5 },
  { title: '手算并记录判断', task: '根据规则预测清洗后会剩几条，并写出你检查了哪些记录。', minutes: 10 },
  { title: '请 AI 起草脚本', task: '确认输入、处理规则和输出文件，然后请 AI 生成脚本。', minutes: 10 },
  { title: '运行并核对', task: '运行脚本，把它生成的文件和你手算的结果逐条对照。', minutes: 20 },
  { title: '改规则，再跑一次', task: '亲手改一处去重规则，记录这次结果和发生变化的原因。', minutes: 10 },
];
const finish = guideSteps.length;
const outputChecks = [1, 2, 3];
const emptyDraft = { rows: '', reason: '', evidence: '' };
const checkRecords = [
  { id: 1, question: '页面加载慢', category: '性能' },
  { id: 2, question: '页面加载慢', category: '访问' },
  { id: 3, question: '页面加载慢', category: '性能' },
];
const checkChoices = [
  { id: 'second', text: '删第 2 条', feedback: '再看分类。第 2 条是「访问」，和第 1 条的「性能」不同，因此应保留。' },
  { id: 'third', text: '删第 3 条', feedback: '答对了。第 3 条的两个字段都与第 1 条相同，保留第一次出现的记录。' },
  { id: 'both', text: '删第 2、3 条', feedback: '你找到了相同的问题。再比较分类，只删除两个字段都重复的记录。' },
];

function judgmentReady(fields) {
  const rows = Number(fields.rows);
  return fields.rows !== '' && Number.isInteger(rows) && rows >= 0 && rows <= 10 && Boolean(fields.reason.trim() && fields.evidence.trim());
}

function downloadExercise(csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tickets.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Sample({ csv }) {
  return (
    <details className="guide-sample" open>
      <summary>查看 10 条样本</summary>
      <div className="code-frame">
        <div><span>tickets.csv</span><button className="action small-action" onClick={() => downloadExercise(csv)}><Download size={15} />下载样本</button></div>
        <pre><code>{csv.trimEnd()}</code></pre>
      </div>
    </details>
  );
}

function ConceptCheck({ answer, onAnswer }) {
  return (
    <section className="guide-quiz" aria-labelledby="guide-quiz-title">
      <h3 id="guide-quiz-title">试一试整行去重</h3>
      <p>三条记录的问题一模一样。按整行去重，哪一条应该删掉？</p>
      <table className="guide-quiz-table">
        <thead><tr><th scope="col">记录</th><th scope="col">问题</th><th scope="col">分类</th></tr></thead>
        <tbody>{checkRecords.map(({ id, question, category }) => <tr key={id}><th scope="row">{id}</th><td>{question}</td><td>{category}</td></tr>)}</tbody>
      </table>
      <div className="guide-inline" role="group" aria-label="去重练习答案">
        {checkChoices.map(({ id, text }) => <button key={id} className="action secondary" type="button" aria-pressed={answer === id} onClick={() => onAnswer(id)}>{text}</button>)}
      </div>
      <p role="status" className="guide-note">{checkChoices.find(({ id }) => id === answer)?.feedback}</p>
    </section>
  );
}

function Judgment({ draft, setDraft, onSave }) {
  function update(field, value) {
    setDraft((old) => ({ ...(old ?? emptyDraft), [field]: value }));
  }

  return (
    <form id="guide-judgment" className="reflection" onSubmit={(event) => {
      event.preventDefault();
      if (judgmentReady(draft)) onSave({ rows: Number(draft.rows), reason: draft.reason.trim(), evidence: draft.evidence.trim() });
    }}>
      <label>我预测保留的记录数
        <input type="number" min="0" max="10" step="1" required value={draft.rows} onChange={(event) => update('rows', event.target.value)} />
      </label>
      <label>我的理由
        <textarea rows={2} required maxLength={500} value={draft.reason} placeholder="你是按什么规则判断的？" onChange={(event) => update('reason', event.target.value)} />
      </label>
      <label>我的证据
        <textarea rows={2} required maxLength={650} value={draft.evidence} placeholder="写下几条具体记录或它们所在的数据行。" onChange={(event) => update('evidence', event.target.value)} />
      </label>
    </form>
  );
}

function AiDraft({ lesson, reflection, scopeConfirmed, setScopeConfirmed, tutorPanel }) {
  const [copyStatus, setCopyStatus] = useState('');
  const [showTutor, setShowTutor] = useState(false);
  const promptRef = useRef(null);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(lesson.prompt);
      setCopyStatus('已复制。把提示词粘贴到你的 AI 工具，生成脚本后保存为 clean_tickets.py。');
    } catch {
      promptRef.current?.focus();
      promptRef.current?.select();
      setCopyStatus('提示词已选中，可以手动复制。');
    }
  }

  return (
    <>
      <p className="guide-note" role="status">
        你的预测是 {reflection.rows} 条。{reflection.rows === lesson.expectedRows ? '和手算参考结果一致。' : '可以先对照空记录和重复记录，再核对一次。'}
      </p>
      <details className="review-box"><summary>核对手算结果</summary><p>{lesson.expectedSummary}</p></details>
      <div className="guide-block">
        <h3>核对委托范围</h3>
        <ul>
          <li>输入文件是 <code>tickets.csv</code>，先去掉字段首尾空白，再丢弃两列都为空的记录。</li>
          <li>只有问题和分类都相同才算重复，保留第一次出现的记录。</li>
          <li>结果另存为 <code>clean_tickets.csv</code>，保留原始文件。</li>
        </ul>
        <label className="scope-check"><input type="checkbox" checked={scopeConfirmed} onChange={(event) => setScopeConfirmed(event.target.checked)} />我确认输入、规则和输出。遇到不清楚的地方，先让 AI 向我提问。</label>
      </div>
      {scopeConfirmed && (
        <div className="guide-block">
          <label className="guide-prompt-label">本课提示词
            <textarea className="guide-prompt" ref={promptRef} readOnly rows={4} value={lesson.prompt} />
          </label>
          <div className="guide-inline">
            <button className="action secondary" type="button" onClick={copyPrompt}><Copy size={16} />复制本课提示词</button>
            <button className="action secondary" aria-expanded={showTutor} type="button" onClick={() => setShowTutor(!showTutor)}>{showTutor ? '收起 AI 学伴' : '在这里打开 AI 学伴'}</button>
          </div>
          {copyStatus && <p className="guide-note" role="status">{copyStatus}</p>}
          {showTutor && tutorPanel}
        </div>
      )}
    </>
  );
}

function Checks({ items, labels, checklist, onCheck }) {
  return (
    <div className="guide-checks">
      {items.map((index) => (
        <label key={index}>
          <input type="checkbox" checked={checklist.includes(index)} onChange={() => onCheck(index)} />{labels[index]}
        </label>
      ))}
    </div>
  );
}

function WeekPractice() {
  return (
    <details className="review-box">
      <summary className="action primary">打开下一项练习 <ArrowRight size={16} /></summary>
      <p>在单独的练习文件夹里保留两版脚本和原样本。每次将测试样本放在脚本旁边并命名为 tickets.csv，先写预期，再运行并保存结果。</p>
      <ul>
        <li>正常样本：放入一条有效记录，验证它会被保留。</li>
        <li>全空样本：只填两个空字段，验证输出是否仍保留表头。</li>
        <li>分类冲突：同一问题配两个分类，比较两种去重规则各保留什么。</li>
      </ul>
      <p>记录在什么输入下结果不符合预期，并尝试用一句话说明原因。</p>
    </details>
  );
}

export default function DayOne({
  lesson, checklist, setChecklist, done, setDone, reflection, setReflection, scopeConfirmed, setScopeConfirmed,
  position, setPosition, draft, setDraft, experiment, setExperiment, tutorPanel,
}) {
  const ranChecks = outputChecks.every((index) => checklist.includes(index));
  const limit = !reflection ? 1 : !scopeConfirmed ? 2 : !ranChecks ? 3 : done ? finish : 4;
  const legacyStep = done ? finish : scopeConfirmed && ranChecks ? 4 : reflection ? 2 : 0;
  const reached = Math.min(limit, Math.max(position?.reached ?? 0, legacyStep));
  const step = Math.min(position?.step ?? legacyStep, reached);
  const current = guideSteps[step];
  const headingRef = useRef(null);
  const justNavigated = useRef(false);
  const draftValue = draft ?? (reflection ? { ...reflection, rows: String(reflection.rows) } : emptyDraft);

  useEffect(() => {
    if (justNavigated.current) {
      justNavigated.current = false;
      window.scrollTo(0, 0);
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [step]);

  function openStep(next) {
    justNavigated.current = true;
    setPosition((old) => ({ ...old, step: next, reached: Math.max(reached, next) }));
  }

  function toggleCheck(index) {
    setChecklist((old) => old.includes(index) ? old.filter((entry) => entry !== index) : [...old, index]);
    if (done) setDone(false);
  }

  function saveJudgment(value) {
    setReflection(value);
    setChecklist((old) => old.includes(0) ? old : [...old, 0]);
    openStep(2);
  }

  function confirmScope(confirmed) {
    setScopeConfirmed(confirmed);
    if (!confirmed && done) setDone(false);
  }

  function finishLesson() {
    setChecklist((old) => old.includes(4) ? old : [...old, 4]);
    setDone(true);
    openStep(finish);
  }

  const buttons = [
    <button key="sample" className="action primary" type="button" onClick={() => openStep(1)}>查看样本并预测 <ArrowRight size={18} /></button>,
    <button key="save" className="action primary" type="submit" form="guide-judgment" disabled={!judgmentReady(draftValue)}>保存判断，去核对规则 <ArrowRight size={18} /></button>,
    <button key="run" className="action primary" type="button" disabled={!scopeConfirmed} onClick={() => openStep(3)}>脚本已保存，去运行 <ArrowRight size={18} /></button>,
    <button key="change" className="action primary" type="button" disabled={!ranChecks} onClick={() => openStep(4)}>核对完毕，去改规则 <ArrowRight size={18} /></button>,
    <button key="finish" className="action primary" type="button" disabled={!experiment.trim() && !checklist.includes(4)} onClick={finishLesson}>完成第一天 <Check size={18} /></button>,
  ];

  return (
    <div className="guided-lesson">
      <header className="guide-header">
        <div className="hero-meta"><span className="label-chip">阶段 1 · 第 1 周 · 第一天</span><span className="time-note"><Clock3 size={16} />约 {lesson.minutes} 分钟</span></div>
        <h1>{lesson.title}</h1>
        <p>今天从一份小样本开始。你会先手算，再请 AI 写代码，最后亲手改一条规则。</p>
      </header>
      <div className="guide-progress">
        <div className="guide-progress-copy"><strong>{current ? `第 ${step + 1} / ${finish} 步` : '第一天已完成'}</strong><span>{reached} / {finish} 步已完成</span></div>
        <progress aria-label="第一天课程进度" value={reached} max={finish} />
      </div>
      <div className="guide-layout">
        <div className="guide-main">
          <section className="guide-card panel" aria-labelledby="guide-step-title">
            <div className="guide-card-head">
              <span className="guide-kicker">{current ? `现在学 · 约 ${current.minutes} 分钟` : '练习完成'}</span>
              <h2 id="guide-step-title" ref={headingRef} tabIndex={-1}>{current?.title ?? '你完成了第一天的练习'}</h2>
              <p>{current?.task ?? '保留原始文件、清洗后的文件和改规则前后的运行结果。它们是你今天的验收证据。'}</p>
              {current && <div className="guide-next"><ArrowRight size={15} /><strong>接下来</strong><span>{guideSteps[step + 1]?.title ?? '完成第一天，查看第 1 周的下一项练习'}</span></div>}
            </div>
            <div className="guide-content" key={step}>
              {step === 0 && (
                <>
                  <div className="concept-grid">
                    {lesson.concepts.map((concept) => <article key={concept.title}><h3>{concept.title}</h3><p>{concept.body}</p><p className="example">{concept.example}</p></article>)}
                  </div>
                  <ConceptCheck answer={position?.answer} onAnswer={(answer) => setPosition((old) => ({ ...old, answer }))} />
                </>
              )}
              {step === 1 && (
                <>
                  <p>先删除两列都为空的记录。再比较每一行的「问题」和「分类」，两列都相同时，只保留第一次出现的记录。表头不计入样本数。</p>
                  <Sample csv={lesson.csv} />
                  <details className="review-box"><summary>卡住了？看一条提示</summary><p>给数据从 1 开始编号。先圈出只有逗号的那行。再从上往下比较，只在两个字段都相同时划掉后出现的那条。</p></details>
                  <Judgment draft={draftValue} setDraft={(update) => setDraft((old) => update(old ?? draftValue))} onSave={saveJudgment} />
                  {!judgmentReady(draftValue) && <p className="fineprint">填入 0 到 10 之间的整数，并写下理由和证据后，就能继续。</p>}
                </>
              )}
              {step === 2 && <AiDraft lesson={lesson} reflection={reflection} scopeConfirmed={scopeConfirmed} setScopeConfirmed={confirmScope} tutorPanel={tutorPanel} />}
              {step === 3 && (
                <>
                  <div className="guide-block">
                    <p>把 <code>clean_tickets.py</code> 和 <code>tickets.csv</code> 放在同一个文件夹。打开这个文件夹的终端，运行：</p>
                    <div className="code-frame"><pre><code>python clean_tickets.py</code></pre></div>
                    <p>Windows 也可以用 <code>py clean_tickets.py</code>。运行后打开生成的 <code>clean_tickets.csv</code>。</p>
                  </div>
                  <details className="review-box"><summary>找不到文件？先检查这里</summary><p>确认脚本和样本在同一个文件夹，终端也打开在该目录。检查文件名是不是完整的 tickets.csv，脚本是不是以 .py 结尾。</p></details>
                  <p className="guide-note" role="status">{lesson.expectedSummary}</p>
                  <Checks items={outputChecks} labels={lesson.checklist} checklist={checklist} onCheck={toggleCheck} />
                  {!ranChecks && <p className="fineprint">核对这三项后就能继续。</p>}
                </>
              )}
              {step === 4 && (
                <>
                  <p>先复制一份能跑通的脚本，保留原来的版本供对照。</p>
                  <p>{lesson.steps[4].body}</p>
                  <div className="guide-block reflection">
                    <label>这次保留了几条？为什么？
                      <textarea rows={3} maxLength={650} value={experiment} placeholder="先写下实际结果，再解释哪条记录的命运变了。" onChange={(event) => setExperiment(event.target.value)} />
                    </label>
                  </div>
                  {!experiment.trim() && !checklist.includes(4) && <p className="fineprint">记下运行结果和原因后，就能完成今天的练习。</p>}
                </>
              )}
              {step === finish && (
                <>
                  <details className="review-box"><summary>核对复跑结果</summary>{experiment.trim() && <p><strong>你的记录</strong>　{experiment.trim()}</p>}<p>{lesson.reviewAnswer}</p></details>
                  <div className="guide-complete"><h3>下一项 · 用三种边界样本测试脚本</h3><p>第 1 周继续用今天的脚本，验证它能否处理正常、全空和分类冲突三种情况。</p><WeekPractice /></div>
                </>
              )}
            </div>
            <div className="guide-actions">
              {step > 0 && <button className="action secondary" type="button" onClick={() => openStep(step - 1)}><ArrowLeft size={16} />{current ? '上一步' : '回顾最后一步'}</button>}
              {current ? buttons[step] : <a className="action secondary" href="#map">返回图谱</a>}
            </div>
          </section>
        </div>
        <aside className="guide-sidebar" aria-label="本课步骤与资料">
          <nav className="guide-outline panel" aria-label="本课步骤">
            <h2>本课步骤</h2>
            <ol>
              {guideSteps.map(({ title }, index) => {
                const status = index === step ? 'current' : index < reached ? 'done' : 'upcoming';
                return (
                  <li key={title} className="guide-outline-item" data-state={status}>
                    <button type="button" disabled={index > reached || index === step} aria-current={index === step ? 'step' : undefined} onClick={() => openStep(index)}>
                      <span className="guide-step-dot" aria-hidden="true">{status === 'done' ? <Check size={14} /> : index + 1}</span>
                      <span>{title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="guide-outline panel">
            <details className="guide-resources">
              <summary>参考资料</summary>
              {lesson.resources.map(({ title, url }) => <a key={url} href={url} target="_blank" rel="noreferrer">{title} <ArrowRight size={14} /></a>)}
            </details>
            <p className="fineprint">步骤与学习记录自动保存在此浏览器。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
