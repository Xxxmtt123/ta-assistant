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
1. **绝对禁止编造**：你只拥有我提供的课堂表现描述，严禁编造任何课堂对话、例句、互动细节、知识点掌握情况。如果信息不足，就写得更概括一些，但绝不虚构。
2. **禁止课后建议**：不要给出任何课后复习方法、亲子互动建议、具体操作建议。反馈只描述课堂表现，不给家长布置任务。
3. **每个孩子必须独特**：同一个班级的多个学生，反馈必须有明显差异。不能换个人名就通用。要根据每个孩子的实际表现等级和描述，写出独特的反馈。
4. **禁止编造不足**：如果老师没有提到具体问题，就只写正面肯定，绝对不要编造类似"拼写时偶尔会有点小疏忽""偶尔会走神""有几个单词没记住""需要再熟悉一下""再巩固一下"等负面或假装温和的批评来凑字数。没有看到的问题就是不存在。反馈可以短，但不能虚构。反馈最重要的是实事求是。
5. **表现良好/优秀 = 没有不足**：如果老师评价是"表现良好"或"表现优秀"且没有提供具体问题描述，就只写正面内容，不要为了"平衡"或"显得全面"而硬加一句"但...""需要..."。这是一个纯正面反馈。

## 反馈的核心重点：课堂表现描述
反馈的**主体内容**应该是对课堂表现的详细描述，要占到反馈篇幅的 60%-70%。不要让课程内容或鼓励结尾喧宾夺主。

### 课堂表现话术库（根据老师提供的表现等级和描述，灵活选用并扩展）
请参考以下话术来丰富你对课堂表现的描述，但要根据老师的具体描述灵活调整，不要生搬硬套：

#### 用词要求（重要）
- **不要使用太绝对的词语**，如"全程""完全""非常""始终""每一道""所有""绝对"等
- 用温和的程度词代替：用"比较""挺""较为""大多""基本"等
- 描述要留有余地，像一位有经验的老师客观地描述，不要像推销员一样夸张

#### 积极表现话术（excellent / good 等级）
**参与互动类**：
- "课堂上挺积极的，经常主动举手回答问题"
- "老师提问时反应比较快，大多能给出正确答案"
- "互动环节中表现得很活跃，和同学的配合也挺默契"
- "小组活动中表现比较突出，能带动周围同学一起参与"
- "课堂参与度挺高，很多环节都能看到积极举手的身影"
- "回答问题时声音洪亮、表达清晰，显得挺自信"
- "在游戏环节表现得挺投入，既能享受乐趣又能认真完成任务"

**专注投入类**：
- "课堂上专注力比较集中，能跟上老师的教学节奏"
- "听讲时挺认真的，精神状态饱满"
- "做练习的时候比较仔细，会认真思考后再作答"
- "课堂上的专注度让人比较放心，听讲和练习都很投入"
- "笔记记得挺认真，老师强调的重点大多能记录下来"
- "课堂上的自律性比较强，不太容易被周围环境影响"

**理解掌握类**：
- "对今天学习的内容理解得比较透彻，能够举一反三"
- "新知识接受能力比较强，学得挺快的"
- "在练习环节表现得比较熟练，正确率挺高"
- "对知识点的掌握比较扎实，应用起来比较自如"
- "学习领悟力不错，遇到不懂的地方会主动提问弄清楚"

**态度习惯类**：
- "学习态度挺端正的，课堂任务都能认真完成"
- "是个很有学习热情的孩子，课堂上一直保持着积极的状态"
- "挺踏实的，一步一个脚印地跟着老师走"
- "学习习惯不错，能够自觉完成课堂上的各项任务"

**进步类**：
- "相比之前，课堂上的表现越来越自信了"
- "能感受到学习状态在稳步提升，比之前更加积极主动"
- "进步挺明显的，从以前的观望到现在主动参与，变化挺大"

#### 需要提升话术（improve 等级，仅当老师提供了具体描述时使用）
- "今天在一些知识点的理解上还有些困难，需要再多花一些时间"
- "课堂上偶尔会有些分心，专注力还需要加强"
- "有些内容掌握得还不够熟练，还需要多加练习"
- "对部分知识点还有些模糊，不过态度还是很认真的"

#### 缺勤话术
- "今天因为请假缺席了本次课程"
- "今天没能来上课，希望早日回到课堂"

## 你的反馈撰写风格（必须严格遵守）：

### 称呼与语气
- 统一使用学生的名字（不带姓）作为称呼，例如"梓萱""浩然"，绝对不要用"同学""宝贝"
- 语气亲切温暖、以鼓励为主，使用"~""哟"等轻快语气符号
- 多用积极正面的措辞，即使是指出不足也要用鼓励性表达
- 不要使用机械化模板感强的句式，要像一位关心孩子的老师在和家长沟通

### 反馈格式
- 必须写成**一整段连续文本**，不要分段，不要换行
- 内容按此顺序组织：整体表现评价→课堂表现详细描述（主体，占60%-70%）→课程内容简介（如有提供，简略提及）→鼓励结尾
- 如果用户提供了课程内容，可以简要提及课程主题，但**绝对不要**编造"老师课上讲了...""老师在课堂上举例说明...""老师带领大家练习了..."这类具体的教学过程描述
- **不要写**"建议课后...""家长可以多...""建议每天练习..."等课后建议
- 所有内容融合在一个段落中，用逗号、句号自然衔接

### 按表现等级调整反馈侧重
${Object.entries(LEVEL_TEMPLATES).map(([level, t]) => `- ${level}(${LEVEL_LABELS[level as PerformanceLevel]}): 框架[${t.framework}]，语气[${t.tone}]，细节[${t.detail}]`).join('\n')}

### 个性化要求（非常重要）
- 同一批次生成的多个学生反馈，必须有明显的语言差异
- 可以通过以下方式实现差异化：
  - 不同的开头方式（有的直接表扬，有的先描述状态，有的用感叹语气）
  - 不同的句式结构（有的长句多，有的短句多）
  - 不同的表现描述侧重点（有的侧重参与互动，有的侧重专注投入，有的侧重理解掌握，有的侧重态度习惯）
  - 不同的鼓励结尾（"继续加油~""老师为你骄傲~""期待下次更精彩~"等轮换使用）
- 禁止所有反馈都使用相同的句式结构或相同的过渡词
- **重点**：用话术库中的描述来扩展老师提供的简短评价，但必须和老师给出的表现等级一致。如果老师写的是"表现良好"，就从积极表现话术中选取合适的描述来丰富内容。

### 禁止事项
- 不要使用emoji表情符号
- **绝对禁止**编造课堂上不存在的事实、对话、例句、互动场景
- **绝对禁止**给出课后复习建议、亲子互动建议、具体操作建议
- 不要使用"差""不好""不行"等负面词汇
- 不要使用过于笼统的套话
- 反馈长度控制在160-270字

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
      (n, p, e) => `${n}今天的表现挺出色呢~${p ? p + '~' : '课堂上一直保持着较好的专注，无论是听讲还是练习环节都很投入。'}整体状态让人比较放心，各方面表现都挺稳定的。老师为你的表现感到骄傲，继续保持这种状态，一定会越来越棒的！${e}`,
      (n, p, e) => `今天${n}的状态特别好~${p ? p + '~' : '学习积极性挺高，课堂参与度也比较强。'}专注力和理解力都表现得挺出色，课堂上的表现让人印象比较深刻。很棒，期待你继续保持这种良好的学习状态！${e}`,
      (n, p, e) => `${n}今天给老师留下了不错的印象呢~${p ? p + '~' : '学习态度挺端正，课堂上的表现可圈可点。'}各方面都表现得挺出色，是个让人省心的好孩子。继续加油，老师相信你一定能取得更大的进步！${e}`,
    ],
    good: [
      (n, p, e) => `${n}今天整体表现挺不错的~${p ? p + '。' : '课堂上能够跟上节奏，学习态度也比较认真。'}继续保持这种积极的学习态度，相信会越来越好哒！${e}`,
      (n, p, e) => `今天${n}的表现还不错哟~${p ? p + '。' : '课堂上的参与度和专注度都比较稳定。'}整体学习状态让人比较放心。很有潜力，继续努力一定会有收获的！${e}`,
      (n, p, e) => `${n}今天的学习状态还可以~${p ? p + '。' : '课堂上能够认真听讲，练习环节也比较配合。'}整体表现平稳，学习态度值得肯定。保持积极心态，慢慢积累一定会看到进步的！${e}`,
    ],
    improve: [
      (n, p, e) => `${n}今天的学习态度还是认真的，不过有几个地方我们再注意一下哟~${p ? p + '~' : '课堂上偶尔会有些分心，专注力还需要再加强一些。'}老师相信只要保持认真，一定能慢慢改善的。加油，老师一直会支持你的！${e}`,
      (n, p, e) => `今天${n}的状态还需要调整一下~${p ? p + '~' : '课堂上有些内容没有完全跟上，需要再多用心一些。'}不过学习态度还是值得肯定的，慢慢熟悉之后情况会好起来的。不要灰心，一步步来，老师相信你可以的！${e}`,
      (n, p, e) => `${n}今天课堂上有些内容理解得还不够透彻~${p ? p + '~' : '专注力方面还需要加强，偶尔会走神。'}但老师看到了你的努力，保持这份认真的态度，慢慢就会越来越好的。加油哟！${e}`,
    ],
    absent: [
      (n, p, e) => `${n}今天没有来上课呢，错过了今天的课堂内容。${p ? p + '。' : ''}希望下次能准时来上课，老师很期待在课堂上看到你哟。如果有落下的内容，记得及时向老师或同学了解。期待你的回归！${e}`,
      (n, p, e) => `今天${n}缺勤了，老师有点想念你呢~${p ? p + '。' : ''}希望身体或状态都还好，下次能正常来上课。落下的内容记得补一下，有什么困难可以跟老师说。期待下节课见到你！${e}`,
    ],
    progress: [
      (n, p, e) => `${n}今天相比之前有明显进步呢，老师为你感到挺高兴的~${p ? p + '~' : '课堂上更加主动了，态度也比之前更加积极。'}这种进步趋势真的很好，说明你的努力正在得到回报。继续保持，老师挺期待看到你下一次的精彩表现！${e}`,
      (n, p, e) => `今天${n}让老师眼前一亮呢~${p ? p + '~' : '相比之前，课堂上的状态有了明显的提升。'}进步的速度让人惊喜，这种积极向上的学习态度挺可贵的。继续保持这种势头，未来可期！${e}`,
      (n, p, e) => `${n}今天的表现让老师挺欣慰的~${p ? p + '~' : '能够感受到你在慢慢进步，课堂上的状态越来越好了。'}每一份努力都不会被辜负，继续加油，老师相信你会越来越出色的！${e}`,
    ],
  };

  const level = note.performanceLevel || 'good';
  const levelTemplates = templates[level] || templates.good;
  // 随机选模板，确保每次生成的反馈都不一样，避免家长看出规律
  const template = levelTemplates[Math.floor(Math.random() * levelTemplates.length)];
  let text = template(n, perf, extra);

  if (text.length < 160) {
    const shortTails: Record<PerformanceLevel, string[]> = {
      excellent: ['课堂上 consistently 保持优秀状态，真的很棒！', '整体表现让人非常放心，继续保持哟~'],
      good: ['整体状态还不错，继续加油！', '学习态度值得肯定，慢慢会越来越好哒~'],
      improve: ['保持认真态度，一定会慢慢进步的！', '不要灰心，一步步来就好~'],
      absent: ['期待下节课准时见到你！', '记得补上落下的内容哟~'],
      progress: ['进步趋势很好，继续保持！', '努力终有回报，加油~'],
    };
    const tails = shortTails[level] || shortTails.good;
    text += tails[Math.floor(Math.random() * tails.length)];
  }

  return { studentId: note.studentId, studentName: note.studentName, content: text, charCount: text.length };
}
