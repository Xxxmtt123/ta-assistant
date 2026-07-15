// AI 反馈生成器
// 通过 Workers 代理调用豆包（火山方舟）大模型 API
// Phase 1 使用本地模板拼接（已弃用）
// Phase 2 使用真实 LLM API
// Phase 3 基于 GY 学员个性化课后反馈库话术风格重写

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

// ====== 反馈库话术风格参考 ======

/** 不同表现等级下的反馈侧重点 */
const LEVEL_FOCUS: Record<PerformanceLevel, string> = {
  excellent:
    '表现优秀：多强调宝贝的亮点和优势，可以建议拓展阅读或更高级的练习，让宝贝"吃得饱"。',
  good:
    '表现良好：先肯定宝贝的表现，再温和指出可以进一步提升的空间，给出具体可操作的练习建议。',
  improve:
    '需要提升：用鼓励性语言温和指出需要改进的地方，多给正向激励，避免让家长或宝贝感到压力。重点放在"需要加强"而非"做得不好"。',
  absent:
    '缺勤请假：告知缺课内容要点，提醒家长协助补课，语气关切，让家长感受到老师的关心。',
  progress:
    '明显进步：着重强调宝贝的进步幅度和变化，用"相比之前""有了很大进步"等表述，鼓励宝贝继续保持。',
};

// 构建反馈生成的 system prompt（基于 GY 学员个性化课后反馈库话术风格）
function buildSystemPrompt(): string {
  const levelFocusText = Object.entries(LEVEL_FOCUS)
    .map(([, v]) => `- ${v}`)
    .join('\n');

  return `你是新东方GY少儿英语的资深助教，拥有丰富的课后反馈撰写经验，深受家长和学生信赖。请根据提供的课程内容和学生的课堂表现，为每位学生撰写个性化课后反馈。

## 角色定位
你是家长和宝贝之间的桥梁，反馈要体现专业性、亲和力和实用性，让家长感受到老师对宝贝的关注和用心。

## 话术风格要求（必须严格遵守）
1. **称呼**：使用"宝贝"称呼学生，不要使用"同学""学生"等称呼
2. **语气**：亲切温暖、以鼓励为主，使用"~"等轻快语气符号增加亲和感
3. **措辞**：多用积极正面的措辞，即使是指出不足也要用鼓励性表达
   - 好的示范："宝贝在发音方面还需要加强练习~"
   - 不好的示范："宝贝发音不好，需要纠正"
4. **具体化**：反馈要具体到课堂学到的知识点（结合课程内容），不要泛泛而谈

## 反馈结构模板（参考以下结构生成）
【开头】宝贝今天整体表现+评价（如活跃/认真/进步明显等），使用"~"增加亲和感
【中间】本节课重点学习了【课程内容】，
       宝贝在【优势方面】表现很好，
       需要加强/注意的地方是【薄弱环节】。
【建议】建议课后多【具体练习建议（如听音频跟读、复习XX知识点等）】，
       家长可以【亲子互动建议（如和孩子一起进行XX活动、多鼓励开口说等）】。
【结尾】鼓励性话语，如"宝贝很棒，继续保持哦！""继续加油！"等

## 字数要求
150-200字，内容充实但不冗长。

## 不同表现等级的反馈侧重点
${levelFocusText}

## 禁止事项
- 不使用任何 emoji 表情符号
- 不编造不存在的事实或知识点
- 不使用过于负面的词汇（如"差""很差""不行""失败"等）
- 不使用机械化的模板句式，要自然流畅
- 不要输出任何标题、编号或格式标记，直接输出纯文本反馈内容`;
}

// 构建单个学生的 user prompt（增强版，支持班级信息）
function buildUserPrompt(
  courseContent: string,
  studentNote: StudentNote,
  additionalPrompt: string,
  classInfo?: { name: string; level?: string },
): string {
  const levelLabel = LEVEL_LABELS[studentNote.performanceLevel] || '表现良好';
  const parts = [
    `## 班级信息`,
    classInfo
      ? `- 班级：${classInfo.name}${classInfo.level ? '（' + classInfo.level + '）' : ''}`
      : '（未提供班级信息）',
    ``,
    `## 课程内容`,
    courseContent || '（未填写具体课程内容，请根据学生表现生成通用反馈）',
    ``,
    `## 学生信息`,
    `- 姓名：${studentNote.studentName}`,
    `- 表现等级：${levelLabel}`,
    `- 课堂表现：${studentNote.performanceNote || '无特别描述，请根据表现等级生成合适的反馈'}`,
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
// 基于 GY 学员个性化课后反馈库话术风格重写

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
      `${n}宝贝今天的学习状态非常棒~课堂上积极参与互动，回答问题又快又准，老师很为你骄傲！本节课重点学习了${t}，宝贝对新知识的理解和掌握都非常好，知识点运用自如，口语表达也很流利自然。${p ? p + '。' : ''}建议课后可以适当拓展课外阅读，多看一些英语绘本或短文，进一步扩大词汇量和语感。家长可以多鼓励宝贝尝试用英语描述日常事物，锻炼口语输出能力。${n}宝贝的表现一直都很优秀，继续保持这种积极的学习态度哦！继续加油！${e}`,

    good: (n, t, p, e) =>
      `${n}宝贝今天的学习状态挺不错的~课堂上能够积极响应老师的提问，这一点非常好！本节课重点学习了${t}，宝贝在新知识点的理解上整体不错，课堂练习也能跟上节奏。${p ? p + '。' : '在部分较难的知识点上还需要多加练习巩固。'}建议课后多听音频跟读，特别是今天学到的重点发音和句型，每天坚持10-15分钟的听读练习，加强语感训练。家长可以多鼓励宝贝开口说英语，培养自信心，也可以和孩子一起进行简单的英语对话练习。${n}宝贝有很好的学习潜力，持续努力一定会取得更大的进步！${e}`,

    improve: (n, t, p, e) =>
      `${n}宝贝今天课堂上学习态度还是比较认真的~本节课重点学习了${t}，宝贝在课堂参与度上还有提升的空间，${p ? p + '。' : '老师希望宝贝能更积极地参与课堂互动。'}部分知识点理解上还需要加强，但不要着急，每个宝贝都有自己的学习节奏~建议课后认真复习今天的内容，每天坚持听读练习15分钟左右，有不明白的地方可以及时向老师请教。家长在课后可以多用鼓励的方式引导宝贝开口说英语，帮助建立学习英语的信心，也可以通过英语儿歌、小游戏来激发宝贝的学习兴趣。老师相信${n}宝贝一定能取得进步的！${e}`,

    absent: (n, t, p, e) =>
      `${n}宝贝今天请假缺席了课堂学习，老师很想念你哦~本节课重点学习了${t}，${p ? p + '。' : '老师带领同学们进行了重点词汇的学习和口语练习活动。'}建议宝贝尽快找同学或老师了解今天的学习内容，把落下的知识点补上。课后作业也需要按时完成哦，有不明白的地方可以随时联系老师。家长方面也请协助督促${n}宝贝在家完成复习和预习工作，保证学习的连贯性。老师期待下节课看到${n}宝贝回到课堂，继续加油！${e}`,

    progress: (n, t, p, e) =>
      `${n}宝贝今天相比之前有了明显的进步，老师为你感到非常高兴~课堂上更加积极主动了，遇到不懂的问题也能大胆提问，这个变化非常棒！本节课重点学习了${t}，宝贝在知识点的掌握上有了很大的提升，口语表达也更加流畅自信了。${p ? p + '。' : '虽然在个别地方还需要继续练习巩固，但整体的进步趋势非常好。'}建议课后多听多读，坚持每天练习，把今天学到的知识点反复巩固，形成长期记忆。家长可以多关注宝贝的学习进展，及时给予肯定和鼓励，也可以设定一些小目标，比如每天记住几个新单词，积少成多效果会非常显著。${n}宝贝的进步势头很棒，继续保持这种积极的学习态度！${e}`,
  };

  const level = note.performanceLevel || 'good';
  let text = (templates[level] || templates.good)(note.studentName, topic, perf, extra);

  // 确保字数达到 150 字
  if (text.length < 150) {
    const tails: Record<PerformanceLevel, string> = {
      excellent: `在课外拓展方面也做得很好，能够主动阅读英语绘本和短文。课堂表现力和创造力都很强，经常能给同学们带来惊喜。继续保持这种优秀的学习势头！`,
      good: `也可以看一些适合年龄段的英语动画片，在娱乐中提升英语听说能力。多听多读多练，英语水平一定会更上一层楼。`,
      improve: `只要有恒心和毅力，每天进步一点点，终会收获满意的成绩。老师和家长都会一直支持${note.studentName}宝贝的学习！`,
      absent: `请家长关注宝贝的出勤情况，确保不缺席重要课程。学习贵在坚持，相信${note.studentName}宝贝补上落下的内容后一定能跟上进度！`,
      progress: `这种进步的势头非常可贵，老师和同学们都为${note.studentName}宝贝感到骄傲。继续保持，未来可期！`,
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
