function readNumber(input) {
  const text = input.trim().normalize('NFKC');
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function questionValue(question, answer) {
  if (typeof answer !== 'string') return null;
  if (!question.options) return readNumber(answer);
  if (!/^\d+$/.test(answer)) return null;
  const index = Number(answer);
  return index < question.options.length ? index : null;
}

export function practiceReady(questions, answers) {
  return questions.every((question, index) => questionValue(question, answers[index]) !== null);
}

export function gradePractice(questions, answers) {
  return questions.map((question, index) => {
    const value = questionValue(question, answers[index]);
    const correct = value !== null && (
      question.options ? value === question.answer : Math.abs(value - question.answer) <= 1e-8
    );
    return {
      correct,
      attempted: question.options ? question.options[value] : answers[index]?.trim(),
      expected: question.options ? question.options[question.answer] : String(question.answer),
    };
  });
}
