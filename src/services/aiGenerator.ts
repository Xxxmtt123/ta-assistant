// AI 反馈生成器
// 通过 Workers 代理调用豆包（火山方舟）大模型 API
// Phase 1 使用本地模板拼接（已弃用）
// Phase 2 使用真实 LLM API

import { aiApi } from './api';
export interface StudentNote {
  studentId: string;
  studentName: string;
  performanceNote: string; // 该学生本节课的简要表现
  performanceLevel: PerformanceLevel;
}

export type PerformanceLevel = 'excellent' | 'good' | 'improve' | 'absent' | 'progress';

export const PERFORMANCE_OPTIONS: { level: PerformanceLevel; label: string; icon: string; color: string }[] = [
  { level: 'excellent', label: '表现优秀', icon: '🌟', color: '#10B981' },
  { level: 'good',       label: '表现良好', icon: '👍', color: '#4F46E5' },
  { level: 'improve',    label: '需要提升', icon: '💪', color: '#F59E0B' },
  { level: 'absent',     label: '缺勤请假', icon: '⚠️', color: '#EF4444' },
  { level: 'progress',   label: '明显进步', icon: '📈', color: '#8B5CF6' },
];

const LEVEL_LABELS: Record<PerformanceLevel, string> = {
  excellent: '表现优秀',
  good: '表现良好',
  improve: '需要提升',
  absent: '缺勤请假',
  progress: '明显进步',
};

export interface GenerateResult {
  studentId: string;
  studentName: string;
  content: string;
  charCount: number;
}

// 构建反馈生成的 system prompt
function buildSystemPrompt(): string {
  return `你是一位经验丰富的英语培训机构助教，擅长撰写课中反馈。请根据提供的课程内容和学生的课堂表现，为每位学生撰写个性化反馈。

## 反馈撰写要求：
1. **字数要求**：150-200字
2. **语言风格**：亲切温暖、鼓励为主、专业可信
3. **内容结构**：
   - 开头：称呼学生并总结本节课的整体表现
   - 中间：具体描述学生在课堂上的表现亮点或需要提升的地方（结合课堂表现描述）
   - 建议：给出针对性的学习建议和课后练习建议
   - 结尾：鼓励性的话语
4. **个性化**：根据不同的表现等级调整语气和侧重点：
   - 表现优秀：强调亮点，鼓励拓展
   - 表现良好：肯定表现，指出可提升空间
   - 需要提升：温和指出问题，给予具体改进建议
   - 缺勤请假：说明缺课内容，提醒补课和复习
   - 明显进步：强调进步幅度，鼓励保持势头
5. **禁止事项**：不要使用emoji，不要编造不存在的事实

请直接输出反馈文本，不要包含任何标题、编号或格式标记。`;
}

// 构建单个学生的 user prompt
function buildUserPrompt(
  courseContent: string,
  studentNote: StudentNote,
  additionalPrompt: string,
): string {
  const levelLabel = LEVEL_LABELS[studentNote.performanceLevel] || '表现良好';
  const parts = [
    `## 课程内容`,
    courseContent,
    ``,
    `## 学生信息`,
    `- 姓名：${studentNote.studentName}`,
    `- 表现等级：${levelLabel}`,
    `- 课堂表现：${studentNote.performanceNote || '无特别描述'}`,
  ];

  if (additionalPrompt) {
    parts.push(``, `## 额外要求`, additionalPrompt);
  }

  return parts.join('\n');
}

// 检测是否可以使用 API
export function isAiApiAvailable(): boolean {
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:8787';
  const token = localStorage.getItem('ta_token');
  // 开发模式下 token 可能为空但仍然可用
  return true;
}

// 单个学生生成
export async function generateSingleFeedback(
  courseContent: string,
  studentNote: StudentNote,
  additionalPrompt: string,
): Promise<GenerateResult> {
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    { role: 'user' as const, content: buildUserPrompt(courseContent, studentNote, additionalPrompt) },
  ];

  try {
    const result = await aiApi.chat(messages);
    const content = result.content;

    return {
      studentId: studentNote.studentId,
      studentName: studentNote.studentName,
      content,
      charCount: content.length,
    };
  } catch (err) {
    console.error('AI 生成失败，使用本地模板兜底:', err);
    // 本地模板兜底
    return generateFallback(studentNote, courseContent, additionalPrompt);
  }
}

// 批量生成（带打字机效果）
export async function generateBatchFeedbackStreamed(
  courseContent: string,
  studentNotes: StudentNote[],
  additionalPrompt: string,
  onProgress?: (index: number, total: number, result: GenerateResult) => void,
  onChunk?: (studentId: string, partialText: string) => void,
): Promise<GenerateResult[]> {
  const results: GenerateResult[] = [];

  for (let i = 0; i < studentNotes.length; i++) {
    const note = studentNotes[i];
    try {
      const messages = [
        { role: 'system' as const, content: buildSystemPrompt() },
        { role: 'user' as const, content: buildUserPrompt(courseContent, note, additionalPrompt) },
      ];
      const content = await aiApi.chatStream(
        messages,
        (partialText) => {
          onChunk?.(note.studentId, partialText);
        },
        {},
      );
      const result: GenerateResult = { studentId: note.studentId, studentName: note.studentName, content, charCount: content.length };
      results.push(result);
      onProgress?.(i + 1, studentNotes.length, result);
    } catch (err) {
      console.error(`生成 ${note.studentName} 的反馈失败:`, err);
      const fallback = generateFallback(note, courseContent, additionalPrompt);
      results.push(fallback);
      onProgress?.(i + 1, studentNotes.length, fallback);
    }
  }

  return results;
}

// 单个学生流式生成
export async function generateSingleFeedbackStreamed(
  courseContent: string,
  studentNote: StudentNote,
  additionalPrompt: string,
  onChunk?: (partialText: string) => void,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    { role: 'user' as const, content: buildUserPrompt(courseContent, studentNote, additionalPrompt) },
  ];

  try {
    const content = await aiApi.chatStream(messages, onChunk || (() => {}), {}, signal);
    return { studentId: studentNote.studentId, studentName: studentNote.studentName, content, charCount: content.length };
  } catch (err) {
    console.error('AI 生成失败，使用本地模板兜底:', err);
    return generateFallback(studentNote, courseContent, additionalPrompt);
  }
}

// 批量生成（非流式，保留兼容）
export async function generateBatchFeedback(
  courseContent: string,
  studentNotes: StudentNote[],
  additionalPrompt: string,
  onProgress?: (index: number, total: number, result: GenerateResult) => void,
): Promise<GenerateResult[]> {
  const results: GenerateResult[] = [];

  for (let i = 0; i < studentNotes.length; i++) {
    const note = studentNotes[i];
    try {
      const result = await generateSingleFeedback(courseContent, note, additionalPrompt);
      results.push(result);
      onProgress?.(i + 1, studentNotes.length, result);
    } catch (err) {
      console.error(`生成 ${note.studentName} 的反馈失败:`, err);
      // 失败时使用本地模板兜底
      const fallback = generateFallback(note, courseContent, additionalPrompt);
      results.push(fallback);
      onProgress?.(i + 1, studentNotes.length, fallback);
    }
  }

  return results;
}

// ====== 本地模板兜底（API 不可用时使用）======

function generateFallback(
  note: StudentNote,
  courseContent: string,
  additionalPrompt: string,
): GenerateResult {
  const topic = courseContent || '本课内容';
  const perf = note.performanceNote || '';
  const extra = additionalPrompt ? `\n${additionalPrompt}` : '';

  const templates: Record<PerformanceLevel, (n: string, t: string, p: string, e: string) => string> = {
    excellent: (n, t, p, e) =>
      `${n}同学本节课表现非常出色！${p ? p + '。' : ''}课堂上积极参与互动，回答问题准确率很高，口语表达流利自然。对今天学习的${t}内容掌握得很好，知识点理解到位，能灵活运用所学句型进行对话练习。课堂笔记记录详细认真，小组讨论时能主动带领组员完成任务。课后作业完成质量也很优秀，建议继续保持这样的学习状态，适当增加课外阅读量，拓展词汇量和语感。${n}的进步让老师非常欣慰，继续加油！${e}`,

    good: (n, t, p, e) =>
      `${n}同学本节课表现良好，学习态度认真积极。${p ? p + '。' : ''}课堂上能够跟上教学节奏，对${t}的理解基本到位。口语练习环节表现不错，发音清晰，能较完整地表达自己的想法。但在一些较难的语法点上还需要多加练习，课堂上可以更主动地举手发言。课后作业完成情况良好，建议每天坚持听读练习15分钟。家长可以在家多和孩子进行简单的英语对话练习。${n}有很好的学习潜力，持续努力一定能取得更大的进步！${e}`,

    improve: (n, t, p, e) =>
      `${n}同学本节课学习态度总体端正，但还需要在以下几个方面继续努力。${p ? p + '。' : '课堂参与度有待提高。'}课堂上对${t}的理解还不够深入，部分知识点需要课后加强巩固。不要害怕犯错，大胆开口说英语是提升口语的关键。建议课后认真复习今天的内容，完成相关练习题，有不明白的地方及时向老师请教。家长方面建议多鼓励孩子，帮助建立学习英语的信心。每天固定15-20分钟的英语学习时间，也可以通过英语歌曲、小游戏来激发学习兴趣。老师相信${n}一定能取得进步！${e}`,

    absent: (n, t, p, e) =>
      `${n}同学本节课缺勤，错过了${t}的学习内容。${p ? p + '。' : '这节课我们讲解了重点词汇和语法结构，还进行了相关的口语练习活动。'}建议尽快找同学借笔记或询问老师，补上今天的知识点。课后作业需要按时完成，有不明白的地方可以随时联系老师。家长方面也请协助督促${n}在家完成复习和预习工作。下节课会有一个小测验，请${n}务必做好准备。如果有任何学习上的困难，老师很乐意提供额外辅导。期待下节课看到${n}回来上课！${e}`,

    progress: (n, t, p, e) =>
      `${n}同学本节课相比之前有明显进步，老师为你感到非常高兴！${p ? p + '。' : ''}课堂上更加主动积极了，遇到不懂的问题也能及时提问。对${t}的掌握程度在稳步提升，口语表达方面比之前更加流畅自信了。虽然有些地方还需要继续练习巩固，但整体学习状态非常好。建议课后多听多读，坚持每天练习，把今天学到的知识点反复巩固。${n}的进步趋势很好，说明正在找到适合自己的学习方法。建议设定小目标，每天记住5个新单词，积少成多效果显著。继续保持这种积极的学习态度！${e}`,
  };

  const level = note.performanceLevel || 'good';
  let text = (templates[level] || templates.good)(note.studentName, topic, perf, extra);

  // 确保字数达到 150 字
  if (text.length < 150) {
    const tails: Record<PerformanceLevel, string> = {
      excellent: `在课外拓展方面也做得很好，能够主动阅读英语绘本和短文。课堂表现力和创造力都很强，经常能给同学们带来惊喜。继续保持这种优秀的学习势头！`,
      good: `也可以看一些适合年龄段的英语动画片，在娱乐中提升英语听说能力。多听多读多练，英语水平一定会更上一层楼。`,
      improve: `只要有恒心和毅力，每天进步一点点，终会收获满意的成绩。老师和家长都会一直支持${note.studentName}的学习！`,
      absent: `请家长关注孩子的出勤情况，确保不缺席重要课程。学习贵在坚持，相信${note.studentName}补上落下的内容后一定能跟上进度！`,
      progress: `这种进步的势头非常可贵，老师和同学们都为${note.studentName}感到骄傲。继续保持，未来可期！`,
    };
    text += tails[level] || tails.good;
  }

  return {
    studentId: note.studentId,
    studentName: note.studentName,
    content: text,
    charCount: text.length,
  };
}
