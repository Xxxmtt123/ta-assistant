// AI 反馈生成器 - 专业版
// 基于 GY各阶学员个性化课后反馈库 话术风格

import { aiApi } from './api';
export interface StudentNote {
  studentId: string;
  studentName: string;
  performanceNote: string;
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

// ====== 专业话术库（从Excel整理）======

// 按课程阶段分的话术风格
const STYLE_BY_LEVEL: Record<string, string> = {
  '自拼': '自然拼读教学风格，注重字母音、CVC单词、blends等拼读规律，使用口诀记忆法',
  '预备': '预备阶段教学风格，注重基础词汇积累和简单句型操练，多用游戏化教学描述',
  '1阶': '1阶教学风格，注重一般现在时、现在进行时、名词单复数、Be动词用法等基础语法，善用口诀如"直去双改"(动词+ing)、"聚富行动"(副词修饰成分)',
  '2阶': '2阶教学风格，注重一般过去时、比较级最高级、频率副词、情态动词must/have to等语法点，善用口诀如"早上很友好"(early-earlier, friendly-friendlier, well-better)',
  '3阶': '3阶教学风格，注重更高级语法和综合运用能力',
};

// A/B/C 三档表现的话术框架
const LEVEL_TEMPLATES = {
  excellent: {
    framework: '肯定亮点 → 具体知识点掌握情况 → 展示优秀例句/表现 → 拓展建议 → 鼓励',
    tone: '用"非常熟悉""掌握得很扎实""基本上都能写对""优秀！"等词汇肯定',
    detail: '要引用课堂上具体的互动细节，如"老师随机说一个动词watch，宝贝就能说出watched，并且造句Tom watched TV last night."这种程度的细节描写',
  },
  good: {
    framework: '整体肯定 → 知识点理解情况 → 部分需要注意的地方 → 复习建议 → 鼓励',
    tone: '用"还不错""能够理解""可以回忆起来"等词汇，对不足用"需要加强""再熟悉一下"等温和表达',
    detail: '要具体指出哪些知识点掌握OK，哪些需要加强，如"宝贝对want的句型中的特殊疑问句和一般疑问句句式变换以及一般疑问句的肯定，否定回答的知识不熟悉"',
  },
  improve: {
    framework: '温和指出困难 → 分析具体问题 → 给出明确改进方法 → 口诀/技巧复习 → 鼓励',
    tone: '用"有点忘了哟""还会有几个错误""有点分不清楚"等温柔表达，绝不使用负面词汇',
    detail: "要给出具体的复习方法，如\"我们可以把之前的笔记拿出来再复习一下哟\"\"口诀'直去双改'所对应的规则要牢记哟\"",
  },
  absent: {
    framework: '说明缺课内容 → 列出本课重点 → 补课建议 → 作业提醒 → 期待回归',
    tone: '温和告知缺席内容，强调补课重要性，表达对宝贝回来的期待',
    detail: '具体说明缺了哪些知识点和口诀，如"动词+ing口诀：直去双改"',
  },
  progress: {
    framework: '强调进步 → 对比之前的表现 → 具体进步细节 → 保持建议 → 鼓励',
    tone: '用"越来越自信""声音越来越响亮""越来越熟练"等描述进步',
    detail: '对比之前和现在的变化，如"在课堂的前半段可能还有些拘谨，但随着课堂的进行，尤其是在互动环节中，宝贝变得越来越自信"',
  },
};

// 构建系统 prompt
function buildSystemPrompt(): string {
  return `你是一位新东方GY少儿英语的资深助教老师，有丰富的课后反馈撰写经验。你非常了解各个学习阶段（自拼、预备、1阶、2阶、3阶）的教学内容和学生的常见问题。

## 你的反馈撰写风格（必须严格遵守）：

### 称呼与语气
- 统一使用"宝贝"称呼学生，绝对不要用"同学"
- 语气亲切温暖、以鼓励为主，使用"~""哟"等轻快语气符号
- 多用积极正面的措辞，即使是指出不足也要用鼓励性表达
- 不要使用机械化模板感强的句式，要像一位关心孩子的老师在和家长沟通

### 反馈结构（按此顺序组织）
1.【开头】宝贝今天整体表现评价（活跃/认真/进步/安静等），2-3句话
2.【中间】本节课重点学习了【课程内容】，宝贝在【优势方面】表现很好，需要加强的是【薄弱环节】。引用课堂上的具体互动细节（如"老师问XXX时，宝贝能够XXX"）
3.【建议】建议课后多【具体练习建议，如听音频跟读、做练习册等】，家长可以【亲子互动建议，如和孩子一起XXX】
4.【结尾】鼓励性话语，"宝贝很棒，继续保持哦~""期待下次课程宝贝更精彩的表现！"

### 按表现等级调整反馈侧重
${Object.entries(LEVEL_TEMPLATES).map(([level, t]) => `- ${level}(${LEVEL_LABELS[level as PerformanceLevel]}): 框架[${t.framework}]，语气[${t.tone}]，细节[${t.detail}]`).join('\n')}

### 教学专业术语参考（根据课程内容灵活使用）
- 自然拼读：字母音、CVC单词、blends、digraphs、音节划分
- 1阶语法口诀：动词+ing"直去双改"、副词修饰"聚富行动"(聚-修饰句子、富-修饰副词、行-修饰形容词、动-修饰动词)、Be动词"我用am你用areis连着他她它"、三单"动词后面小尾巴"
- 2阶语法口诀：副词比较级"早上很友好"(early-earlier, friendly-friendlier, well-better)、频率副词always/sometimes/seldom/never、must(必须)/have to(不得不)
- 现在进行时标志词：now, at the moment, look, listen, these days, where, please, be quiet

### 禁止事项
- 不要使用emoji表情符号
- 不要编造课堂上不存在的事实
- 不要使用"差""不好""不行"等负面词汇
- 不要使用过于笼统的套话
- 反馈长度控制在150-250字

请直接输出反馈文本，不要包含标题或编号。`;
}

// 构建用户 prompt
function buildUserPrompt(
  courseContent: string,
  studentNote: StudentNote,
  additionalPrompt: string,
  classInfo?: { name: string; level?: string },
): string {
  const levelLabel = LEVEL_LABELS[studentNote.performanceLevel] || '表现良好';
  const level = classInfo?.level || '';
  const levelHint = level ? `\n教学阶段参考：${STYLE_BY_LEVEL[level] || '通用教学风格'}` : '';

  const parts = [
    `## 班级信息`,
    classInfo ? `- 班级：${classInfo.name}${level ? '（' + level + '）' : ''}` : '',
    levelHint,
    ``,
    `## 课程内容`,
    courseContent || '（未填写具体课程内容，请根据学生表现等级生成通用的课后反馈）',
    ``,
    `## 学生信息`,
    `- 姓名：${studentNote.studentName}`,
    `- 表现等级：${levelLabel}`,
    `- 课堂表现：${studentNote.performanceNote || '无特别描述，请根据表现等级和GY话术风格生成合适的反馈'}`,
  ];

  if (additionalPrompt) {
    parts.push(``, `## 额外要求`, additionalPrompt);
  }

  return parts.join('\n');
}

// 检测是否可以使用 API
export function isAiApiAvailable(): boolean {
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
    return { studentId: studentNote.studentId, studentName: studentNote.studentName, content, charCount: content.length };
  } catch (err) {
    console.error('AI 生成失败，使用本地模板兜底:', err);
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
      const content = await aiApi.chatStream(messages, (partialText) => { onChunk?.(note.studentId, partialText); }, {});
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

// 批量生成（非流式）
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
      const fallback = generateFallback(note, courseContent, additionalPrompt);
      results.push(fallback);
      onProgress?.(i + 1, studentNotes.length, fallback);
    }
  }
  return results;
}

// ====== 本地模板兜底（GY话术风格）======

function generateFallback(note: StudentNote, courseContent: string, additionalPrompt: string): GenerateResult {
  const topic = courseContent || '本课内容';
  const perf = note.performanceNote || '';
  const extra = additionalPrompt ? `\n${additionalPrompt}` : '';
  const n = note.studentName;

  const templates: Record<PerformanceLevel, (name: string, topic: string, perf: string, extra: string) => string> = {
    excellent: (n, t, p, e) =>
      `宝贝今天的学习状态非常不错呢~课堂上能够积极地响应老师的提问，很棒！今天我们学习了${t}的内容，宝贝对新知识点的理解非常到位，课堂上老师提问时能够准确回答，掌握得很扎实哟。${p ? p + '~' : ''}建议课后可以多听音频跟读，把今天学到的知识点再巩固一下，同时也可以适当做一些拓展练习来加深理解。家长可以多鼓励宝贝开口说英语，培养自信心。宝贝很棒，继续保持哦！${e}`,

    good: (n, t, p, e) =>
      `宝贝今天整体表现挺不错的~课堂上能够跟上老师的节奏，学习态度认真积极。今天我们学习了${t}，宝贝在知识点的理解上还不错，${p ? p + '。' : '部分内容掌握得比较好。'}需要加强的地方是课后要多听多读，特别是今天学到的重点内容，建议每天坚持听读练习10-15分钟。家长可以在课后多和宝贝进行简单的英语互动，帮助宝贝把所学内容运用到生活中。宝贝很有潜力，持续努力一定会取得更大的进步！${e}`,

    improve: (n, t, p, e) =>
      `宝贝今天的学习态度总体还是认真的，不过有几个地方我们再熟悉一下哟~${p ? p + '~' : ''}今天学习了${t}的内容，宝贝对部分知识点的理解还需要再巩固一下。建议课后认真复习今天的内容，可以对照笔记把知识点过一遍，有不明白的地方及时向老师请教。家长方面可以多鼓励宝贝，帮助建立学习英语的信心。每天固定15-20分钟的英语学习时间，也可以通过英语歌曲、小游戏来激发学习兴趣。老师相信宝贝一定能取得进步，加油哟！${e}`,

    absent: (n, t, p, e) =>
      `${n}宝贝本节课缺勤了，错过了${t}的学习内容。${p ? p + '。' : '这节课我们重点讲解了新的知识点，还进行了相关的练习活动。'}建议尽快找同学借笔记或询问老师，补上今天的学习内容。课后作业也需要按时完成哟。家长方面请协助督促宝贝在家完成复习和预习工作。期待下节课看到宝贝回来上课！${e}`,

    progress: (n, t, p, e) =>
      `宝贝今天相比之前有明显进步呢，老师为你感到非常高兴~${p ? p + '~' : ''}课堂上更加主动积极了，遇到不懂的问题也能及时提问，在互动环节中也越来越自信。对${t}的掌握程度在稳步提升，口语表达方面比之前更加流畅了。建议课后多听多读，坚持每天练习，把今天学到的知识点反复巩固。宝贝的进步趋势很好，说明正在找到适合自己的学习方法。继续保持这种积极的学习态度，老师很期待宝贝下次更精彩的表现！${e}`,
  };

  const level = note.performanceLevel || 'good';
  let text = (templates[level] || templates.good)(n, topic, perf, extra);

  if (text.length < 150) {
    const tails: Record<PerformanceLevel, string> = {
      excellent: '在课外拓展方面也做得很好，能够主动阅读英语绘本和短文。课堂表现力和创造力都很强，经常能给同学们带来惊喜。继续保持这种优秀的学习势头！',
      good: '也可以看一些适合年龄段的英语动画片，在娱乐中提升英语听说能力。多听多读多练，英语水平一定会更上一层楼。',
      improve: '只要有恒心和毅力，每天进步一点点，终会收获满意的成绩。老师和家长都会一直支持宝贝的学习！',
      absent: '请家长关注宝贝的出勤情况，确保不缺席重要课程。学习贵在坚持，相信宝贝补上落下的内容后一定能跟上进度！',
      progress: '这种进步的势头非常可贵，老师和同学们都为宝贝感到骄傲。继续保持，未来可期！',
    };
    text += tails[level] || tails.good;
  }

  return { studentId: note.studentId, studentName: note.studentName, content: text, charCount: text.length };
}
