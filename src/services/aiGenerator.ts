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

// A/B/C 三档表现的话术框架（基于实际观察，禁止编造）
const LEVEL_TEMPLATES = {
  excellent: {
    framework: '肯定亮点 → 基于实际观察的具体表现 → 鼓励',
    tone: '用"比较熟悉""掌握得挺扎实""大多都能写对""优秀！"等词汇肯定',
    detail: '只写你实际观察到的正面表现。纯正面反馈，绝对不要加"但""需要加强"等转折。',
  },
  good: {
    framework: '整体肯定 → 基于实际观察的表现描述 → 鼓励',
    tone: '用"还不错""能够理解""可以回忆起来"等词汇肯定',
    detail: '如果老师没有提供具体问题，就只写正面内容，不要硬加"但...""需要..."。如果确有不足描写，用温和表达提及。',
  },
  improve: {
    framework: '温和指出观察到的困难 → 基于实际表现分析 → 鼓励',
    tone: '用"有点忘了哟""还会有几个错误""有点分不清楚"等温柔表达，绝不使用负面词汇',
    detail: '只写实际观察到的问题，不要编造具体的错误场景，也不要给课后复习方法',
  },
  absent: {
    framework: '说明缺勤情况 → 温和提醒补课 → 期待回归',
    tone: '温和告知缺席，表达对宝贝回来的期待',
    detail: '只说明缺勤事实，不要编造缺了哪些知识点',
  },
  progress: {
    framework: '强调进步 → 基于实际观察的进步表现 → 鼓励',
    tone: '用"越来越自信""声音越来越响亮""越来越熟练"等描述进步',
    detail: '只写实际观察到的进步表现，不要编造对比场景',
  },
};

// 构建系统 prompt
function buildSystemPrompt(): string {
  return `你是一位新东方GY少儿英语的资深助教老师，有丰富的课后反馈撰写经验。

## 核心原则（最高优先级）
1. **实事求是**：只根据老师提供的课堂表现描述来写反馈。严禁编造课堂对话、例句、互动细节。信息不足就写得更概括，绝不虚构。
2. **禁止编造不足**：如果老师没有提到具体问题，就只写正面肯定。不要编造"拼写时偶尔小疏忽""偶尔走神""需要再熟悉一下"等负面内容来凑字数。没有看到的问题就是不存在。
3. **表现良好/优秀 = 纯正面**：如果老师评价是"表现良好"或"表现优秀"且没有提供具体问题描述，就只写正面内容，不要硬加"但...""需要..."。
4. **每个孩子必须独特**：同一批次多个学生的反馈，不能换个人名就通用。要有明显的语言差异、不同的侧重点、不同的具体知识点举例。

## 参考反馈风格（请模仿以下写作风格）

以下是老师撰写的优质反馈范例，请仔细学习其表达方式、句式结构和用词习惯：

**范例1**：
"家乐本节课能紧跟授课节奏开展学习，虽上课稍有迟到，但很快调整状态融入课堂，适应能力不错。对于地点场所类词汇，他发音标准、认读熟练，面对老师提问时也能大声作答，课堂互动表现良好。本节课的位移介词知识点能够基本理解，不过还需多结合例句区分across、through、past等词的用法。课后可以多进行造句练习，巩固介词运用。整体学习态度端正，继续保持当下的学习状态，勤加练习语法内容，知识掌握会更加扎实。希望上课期间能够更加专注于语法知识点的学习。"

**范例2**：
"雨桐本节课学习状态出色，对新知识掌握熟练。学习theater时，他能结合center这类同后缀单词联动记忆发音，学习方法灵活高效。本节课所有地点类词汇发音标准、掌握扎实，课堂上也总能积极回应提问，互动表现亮眼。对于across、into、through等位移介词，他理解透彻，能够熟练区分并正确运用。整体知识吸收和运用能力都不错。建议继续保持良好的学习习惯与巧记单词的方法，课后可尝试多用所学词汇和介词造句，进一步提升语言综合运用能力。"

**范例3**：
"钰钦本节课听课状态专注，全程紧跟教学节奏，完成书面练习时态度认真、投入度高。课堂提问环节，他总能准确作答，知识掌握扎实。上课期间能够主动记好课堂笔记，方便后续巩固复习。对于本次所学的地点类词汇，他记忆牢固，认读与拼写都没有问题；各类位移介词也能熟练辨析、灵活运用。整体学习效果很不错。建议后续课堂上更加主动一些，积极举手发言，大胆表达自己的想法。在巩固现有知识的同时，多尝试自主造句练习，进一步提升语言运用能力。"

### 从范例中提炼的风格要点：
- **开头**：直接以学生名字开头，接整体学习状态评价（"能紧跟授课节奏""学习状态出色""听课状态专注"）
- **知识点描述**：具体提到本课学的词汇、语法点，用"对于...""本节课的..."引入
- **课堂表现细节**：具体描述"发音标准""认读熟练""大声作答""准确作答""主动记笔记"等
- **课后建议**：如果老师提供了课程内容，可以给出与课程内容直接相关的具体练习建议（如"多进行造句练习""多用所学词汇造句"），但不要泛泛地说"多听多读""每天练习"
- **结尾**：正面鼓励或具体期待（"继续保持当下的学习状态""知识掌握会更加扎实"）
- **语气**：专业、客观、温暖但不做作，不用"~""哟"等语气词，不用emoji
- **代词**：使用"他"（不区分性别，统一用"他"）

## 反馈的核心重点：课堂表现描述
反馈的**主体内容**应该是对课堂表现的详细描述，要占到反馈篇幅的 60%-70%。

### 课堂表现话术库（灵活选用并扩展）

#### 用词要求
- **不要使用太绝对的词语**，如"全程""完全""非常""始终""每一道""所有""绝对"等
- 用温和的程度词代替：用"比较""挺""较为""大多""基本""不错""能够"等
- 描述要留有余地，像一位有经验的老师客观地描述

#### 参与互动话术
- "课堂上挺积极的，经常主动举手回答问题"
- "老师提问时反应比较快，大多能给出正确答案"
- "互动环节中表现得很活跃，和同学的配合也挺默契"
- "课堂参与度挺高，很多环节都能看到积极举手的身影"
- "回答问题时声音洪亮、表达清晰，显得挺自信"
- "面对老师提问时也能大声作答，课堂互动表现良好"

#### 专注投入话术
- "课堂上专注力比较集中，能跟上老师的教学节奏"
- "听讲时挺认真的，精神状态饱满"
- "完成书面练习时态度认真、投入度比较高"
- "课堂上的专注度让人比较放心，听讲和练习都很投入"
- "笔记记得挺认真，老师强调的重点大多能记录下来"
- "上课期间能够主动记好课堂笔记，方便后续巩固复习"

#### 知识掌握话术
- "对于本次所学的词汇，记忆牢固，认读与拼写都没有问题"
- "新知识接受能力比较强，学得挺快的"
- "在练习环节表现得比较熟练，正确率挺高"
- "对知识点的掌握比较扎实，应用起来比较自如"
- "能够结合已学内容联动记忆，学习方法灵活高效"
- "发音标准、认读熟练，知识掌握扎实"

#### 课后建议话术（仅在老师提供了课程内容时使用，建议要具体）
- "课后可以多进行造句练习，巩固所学内容"
- "建议课后多尝试用所学词汇和句型造句，进一步提升语言运用能力"
- "在巩固现有知识的同时，多尝试自主造句练习"
- "建议继续保持良好的学习习惯，课后可多复习本次所学内容"
- "勤加练习语法内容，知识掌握会更加扎实"

### 知识点多样化要求（非常重要）
如果老师在"课程内容"中填写了具体知识点（如词汇、语法等），在给不同学生写反馈时：
- **不要所有学生都列举相同的知识点**，要从课程内容中轮换选取不同的词汇/语法来举例
- 比如课程内容包含10个词汇，学生A可以提其中3个，学生B提另外3个
- 这样每位学生的反馈都有独特的知识点描述，避免家长之间对比发现雷同

## 反馈格式
- 必须写成**一整段连续文本**，不要分段，不要换行
- 内容按此顺序组织：整体表现评价→课堂表现详细描述（主体，60%-70%）→知识点掌握情况→课后建议（如有课程内容，给出与课程相关的具体建议）→鼓励结尾
- 所有内容融合在一个段落中，用逗号、句号自然衔接
- 反馈长度控制在160-270字

### 个性化差异化要求
同一批次的多个学生反馈，必须有明显差异：
- 不同的开头方式（有的直接评价状态，有的先描述具体表现）
- 不同的知识点举例（轮换选取课程中的不同词汇/语法）
- 不同的表现侧重点（有的侧重互动，有的侧重专注，有的侧重知识掌握）
- 不同的课后建议角度（如有的建议造句，有的建议复习笔记，有的建议多朗读）
- 不同的鼓励结尾

### 禁止事项
- 不要使用emoji表情符号
- 不要使用"~""哟"等语气词
- **绝对禁止**编造课堂上不存在的事实、对话、互动场景
- 不要使用"差""不好""不行"等负面词汇
- 不要使用过于笼统的套话
- 不要使用"全程""完全""非常""始终"等绝对化词语

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
    `- 姓名：${studentNote.studentName}（注意：称呼时只使用名字，不带姓。如果是两个字的姓名，直接使用；如果是三个字及以上，去掉姓氏只取名字部分）`,
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

// 批量生成（带打字机效果，最多 10 个并发）
export async function generateBatchFeedbackStreamed(
  courseContent: string,
  studentNotes: StudentNote[],
  additionalPrompt: string,
  onProgress?: (index: number, total: number, result: GenerateResult) => void,
  onChunk?: (studentId: string, partialText: string) => void,
): Promise<GenerateResult[]> {
  const CONCURRENCY = 10;
  const results: GenerateResult[] = new Array(studentNotes.length);
  let completed = 0;

  async function processOne(i: number) {
    const note = studentNotes[i];
    try {
      const messages = [
        { role: 'system' as const, content: buildSystemPrompt() },
        { role: 'user' as const, content: buildUserPrompt(courseContent, note, additionalPrompt) },
      ];
      const content = await aiApi.chatStream(messages, (partialText) => { onChunk?.(note.studentId, partialText); }, {});
      const result: GenerateResult = { studentId: note.studentId, studentName: note.studentName, content, charCount: content.length };
      results[i] = result;
    } catch (err) {
      console.error(`生成 ${note.studentName} 的反馈失败:`, err);
      results[i] = generateFallback(note, courseContent, additionalPrompt);
    }
    completed++;
    onProgress?.(completed, studentNotes.length, results[i]!);
  }

  // 分批并发执行
  for (let batch = 0; batch < studentNotes.length; batch += CONCURRENCY) {
    const batchItems = studentNotes.slice(batch, batch + CONCURRENCY).map((_, j) => processOne(batch + j));
    await Promise.all(batchItems);
  }
  return results.filter(Boolean);
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

// 批量生成（非流式，最多 10 个并发）
export async function generateBatchFeedback(
  courseContent: string,
  studentNotes: StudentNote[],
  additionalPrompt: string,
  onProgress?: (index: number, total: number, result: GenerateResult) => void,
): Promise<GenerateResult[]> {
  const CONCURRENCY = 10;
  const results: GenerateResult[] = new Array(studentNotes.length);
  let completed = 0;

  async function processOne(i: number) {
    const note = studentNotes[i];
    try {
      const result = await generateSingleFeedback(courseContent, note, additionalPrompt);
      results[i] = result;
    } catch (err) {
      console.error(`生成 ${note.studentName} 的反馈失败:`, err);
      results[i] = generateFallback(note, courseContent, additionalPrompt);
    }
    completed++;
    onProgress?.(completed, studentNotes.length, results[i]!);
  }

  for (let batch = 0; batch < studentNotes.length; batch += CONCURRENCY) {
    const batchItems = studentNotes.slice(batch, batch + CONCURRENCY).map((_, j) => processOne(batch + j));
    await Promise.all(batchItems);
  }
  return results.filter(Boolean);
}

// ====== 本地模板兜底（基于实际观察，禁止编造，禁止课后建议）======

function generateFallback(note: StudentNote, courseContent: string, additionalPrompt: string): GenerateResult {
  const perf = note.performanceNote || '';
  const extra = additionalPrompt ? `\n${additionalPrompt}` : '';
  const n = note.studentName;

  // 多套模板，确保同批次生成的反馈不会雷同
  const templates: Record<PerformanceLevel, ((name: string, perf: string, extra: string) => string)[]> = {
    excellent: [
      (n, p, e) => `${n}本节课学习状态出色，能够紧跟授课节奏开展学习。${p ? p + '。' : '课堂上专注力比较集中，听讲和练习都很投入。'}面对老师提问时也能准确作答，课堂互动表现良好。整体知识吸收和运用能力都不错，继续保持当下的学习状态，知识掌握会更加扎实。${e}`,
      (n, p, e) => `${n}本节课听课状态专注，完成书面练习时态度认真、投入度比较高。${p ? p + '。' : '课堂提问环节，他大多能给出正确答案，知识掌握扎实。'}新知识接受能力比较强，学得挺快的。建议继续保持良好的学习习惯，课后可多复习本次所学内容。${e}`,
      (n, p, e) => `${n}本节课能跟上教学节奏，课堂参与度挺高。${p ? p + '。' : '课堂上也总能积极回应提问，互动表现亮眼。'}对所学内容掌握比较扎实，发音标准、认读熟练。整体学习效果很不错，继续保持这种良好的学习状态。${e}`,
    ],
    good: [
      (n, p, e) => `${n}本节课整体表现不错，课堂上能够跟上授课节奏。${p ? p + '。' : '学习态度比较认真，听讲时精神状态饱满。'}面对老师提问时能够积极作答，课堂互动表现良好。对本次所学内容掌握得比较扎实，课后可多尝试用所学词汇造句，进一步提升语言运用能力。${e}`,
      (n, p, e) => `${n}本节课听课状态还不错，能够紧跟老师的教学节奏。${p ? p + '。' : '课堂上的参与度和专注度都比较稳定。'}在练习环节表现得比较熟练，正确率挺高。整体学习状态让人比较放心，继续保持积极的学习态度，会有更多收获。${e}`,
      (n, p, e) => `${n}本节课学习态度端正，课堂上能够认真听讲。${p ? p + '。' : '做练习的时候比较仔细，会认真思考后再作答。'}课堂上的自律性比较强，笔记记得也挺认真。建议后续课堂上更加主动一些，积极举手发言，大胆表达自己的想法。${e}`,
    ],
    improve: [
      (n, p, e) => `${n}本节课学习态度还是认真的，课堂上能够跟上教学节奏。${p ? p + '。' : '不过在一些知识点的理解上还有些困难，需要再多花一些时间。'}老师相信只要保持认真，慢慢就会好起来的。课后可以多复习本次所学内容，巩固知识点。${e}`,
      (n, p, e) => `${n}本节课听课状态还需要再加强一些。${p ? p + '。' : '课堂上有些内容没有完全跟上，不过态度还是挺端正的。'}慢慢熟悉之后情况会好起来的。不要灰心，一步步来，老师相信你可以的。${e}`,
      (n, p, e) => `${n}本节课上课期间能够认真听讲，态度值得肯定。${p ? p + '。' : '不过有些内容掌握得还不够熟练，还需要多加练习。'}保持这份认真的态度，课后多花一些时间巩固，一定会看到进步的。${e}`,
    ],
    absent: [
      (n, p, e) => `${n}今天因为请假缺席了本次课程。${p ? p + '。' : ''}希望下次能准时来上课。如果有落下的内容，记得及时向老师或同学了解，及时补上。期待早日回到课堂！${e}`,
      (n, p, e) => `${n}今天没能来上课。${p ? p + '。' : ''}希望身体或状态都还好，下次能正常参加课程。落下的内容记得补一下，有什么困难可以跟老师说。期待下节课见到你。${e}`,
    ],
    progress: [
      (n, p, e) => `${n}本节课相比之前有明显进步，老师为他感到挺高兴的。${p ? p + '。' : '课堂上更加主动了，态度也比之前更加积极。'}这种进步趋势真的很好，说明他的努力正在得到回报。继续保持，期待看到下一次的精彩表现。${e}`,
      (n, p, e) => `${n}本节课让老师眼前一亮，相比之前课堂上的状态有了明显的提升。${p ? p + '。' : '课堂参与度提高了不少，回答问题也更加自信了。'}进步的速度让人惊喜，这种积极向上的学习态度挺可贵的。继续保持这种势头，未来可期。${e}`,
      (n, p, e) => `${n}本节课的表现让老师挺欣慰的，能够感受到他在慢慢进步。${p ? p + '。' : '课堂上的状态越来越好了，从以前的观望到现在主动参与。'}每一份努力都不会被辜负，继续保持，老师相信他会越来越出色。${e}`,
    ],
  };

  const level = note.performanceLevel || 'good';
  const levelTemplates = templates[level] || templates.good;
  const template = levelTemplates[Math.floor(Math.random() * levelTemplates.length)];
  let text = template(n, perf, extra);

  if (text.length < 160) {
    const shortTails: Record<PerformanceLevel, string[]> = {
      excellent: ['课堂上始终保持优秀状态，真的很棒。', '整体表现让人比较放心，继续保持。'],
      good: ['整体状态还不错，继续加油。', '学习态度值得肯定，慢慢会越来越好。'],
      improve: ['保持认真态度，一定会慢慢进步的。', '不要灰心，一步步来就好。'],
      absent: ['期待下节课准时见到你。', '记得补上落下的内容。'],
      progress: ['进步趋势很好，继续保持。', '努力终有回报，加油。'],
    };
    const tails = shortTails[level] || shortTails.good;
    text += tails[Math.floor(Math.random() * tails.length)];
  }

  return { studentId: note.studentId, studentName: note.studentName, content: text, charCount: text.length };
}
