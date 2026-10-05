export interface ClubDirection {
  id: string;
  label: string;
  summary: string;
}

export interface ClubActivity {
  id: string;
  title: string;
  when: string;
  note: string;
}

export interface ClubContact {
  advisor: string;
  studentLead: string;
  email: string;
}

export interface ClubRecord {
  id: string;
  name: string;
  shortName: string;
  slogan: string;
  description: string;
  focusAreas: string[];
  flagshipActivities: ClubActivity[];
  relatedCompetitions: ClubDirection[];
  advisorOrContact: ClubContact;
  joinGuide: string;
  themeColor: string;
}

export const clubsData: ClubRecord[] = [
  {
    id: "quant-investment",
    name: "量化投资工作室",
    shortName: "量化投资",
    slogan: "以AI赋能量化，用实战锤炼能力",
    description:
      "融合AI+量化技术，主打竞赛历练、项目实操与科研创作，依托专业师资与专属场地，打造系统化学习成长平台，带你解锁金融科技、数据建模与算法应用新领域。",
    focusAreas: ["量化投资", "AI金融融合", "数学建模", "数据分析", "算法编程"],
    flagshipActivities: [
      {
        id: "quant-competition",
        title: "竞赛集训",
        when: "赛事周期内",
        note: "深耕数模国赛、美赛、大湾区杯金融数模赛等国省级赛事。",
      },
      {
        id: "quant-project",
        title: "项目实战与论文写作",
        when: "学期内持续",
        note: "结合真实金融场景开展项目实操与科研论文写作。",
      },
      {
        id: "quant-kaggle",
        title: "Kaggle/QuantConnect 特训",
        when: "假期及周末",
        note: "征战Kaggle、QuantConnect、阿里云天池等国际量化与AI赛事。",
      },
      {
        id: "quant-math-seminar",
        title: "数学研讨班",
        when: "每周开展",
        note: "组织数学建模与量化分析相关的研讨学习，夯实数学基础，提升建模能力。",
      },
    ],
    relatedCompetitions: [
      {
        id: "math-modeling",
        label: "数学建模竞赛",
        summary: "提供选题拆解、模型构建与论文答辩辅导。",
      },
      {
        id: "quant-finance",
        label: "量化金融赛事",
        summary: "聚焦股价预测、因子挖掘、风险建模等方向。",
      },
    ],
    advisorOrContact: {
      advisor: "徐鹏程",
      studentLead: "李同学",
      email: "84025375@qq.com",
    },
    joinGuide: "关注每学期招新通知，欢迎对量化、AI、数学建模感兴趣的同学加入。",
    themeColor: "from-cyan-500/20 to-blue-500/10",
  },
  {
    id: "java-tribe",
    name: "爪哇部落",
    shortName: "爪哇部落",
    slogan: "汇聚IT同好，共探技术成长之路",
    description:
      "以博采众长、共同进步为理念，搭建校内优质IT交流学习平台，常态化开展各类技术分享活动。这里可交流学习、考研经验，也能对接行业大厂前辈汲取经验，同时配备学习资料与内推资源，营造浓厚的技术氛围。",
    focusAreas: ["产品设计", "视觉创意设计", "前端开发", "后端开发", "算法研发"],
    flagshipActivities: [
      {
        id: "java-sharing",
        title: "技术分享会",
        when: "定期举办",
        note: "涵盖产品、设计、前端、后端、算法等多方向技术交流。",
      },
      {
        id: "java-alumni",
        title: "大厂前辈交流",
        when: "学期内不定期",
        note: "邀请行业大厂校友分享经验，提供内推资源对接。",
      },
    ],
    relatedCompetitions: [
      {
        id: "software-design",
        label: "软件设计大赛",
        summary: "创意与技术的舞台，激发创新思维，提升编程能力。",
      },
      {
        id: "innovation-it",
        label: "IT创新赛事",
        summary: "覆盖产品设计与全栈开发方向。",
      },
    ],
    advisorOrContact: {
      advisor: "钟培权",
      studentLead: "郑博诚",
      email: "java-tribe@college.example",
    },
    joinGuide: "欢迎所有对IT技术感兴趣的同学加入，关注每学期招新信息。",
    themeColor: "from-orange-500/20 to-red-500/10",
  },
  {
    id: "ai-studio",
    name: "人工智能工作室",
    shortName: "AI工作室",
    slogan: "深耕本地大模型，打造AI学习实践平台",
    description:
      "围绕大模型本地化部署、AI应用开发、知识库搭建与智能体实践，搭建面向技术学习、项目实训、竞赛支持和经验交流的实践平台。",
    focusAreas: ["智能体开发", "工作流自动化", "大模型应用", "本地化部署", "知识库搭建"],
    flagshipActivities: [
      {
        id: "ai-local-dev",
        title: "AI大模型本地化开发",
        when: "学期内持续",
        note: "开展AI大模型本地化部署与开发工作。",
      },
      {
        id: "ai-dify",
        title: "Dify平台实践",
        when: "定期开展",
        note: "借助Dify等低代码平台，学习知识库搭建、业务工作流设计与智能体开发，帮助零基础同学完成AI应用入门实践。",
      },
      {
        id: "ai-math-tutor",
        title: "数学出题智能体搭建实训",
        when: "暑期开展",
        note: "围绕数学出题智能体项目，采用VibeCoding协作开发方式，带领新成员从知识库构建到智能体设计完成一次真实AI应用开发实践。",
      },
    ],
    relatedCompetitions: [
      {
        id: "ai-competition",
        label: "人工智能赛事",
        summary: "聚焦AI应用与模型开发方向。",
      },
      {
        id: "ai-innovation",
        label: "AI创新赛",
        summary: "支持RAG应用与智能体开发。",
      },
    ],
    advisorOrContact: {
      advisor: "徐鹏程",
      studentLead: "林同学",
      email: "ai-studio@college.example",
    },
    joinGuide: "对AI技术感兴趣的同学均可报名，关注学期招新通知。",
    themeColor: "from-violet-500/20 to-purple-500/10",
  },
  {
    id: "bricks-team",
    name: "机器人工作室",
    shortName: "机器人工作室",
    slogan: "以机甲竞技践行工程理想",
    description:
      "广金首支深耕RoboMaster赛事的机器人战队BRICKS所属工作室，依托硬核技术打造竞技团队，专注培养综合型工程技术人才。BRICKS战队征战RoboMaster机甲大师高校系列赛（RMU），汇聚全国百余所高校同台比拼。",
    focusAreas: ["机械设计", "嵌入式开发", "视觉算法", "宣传运营"],
    flagshipActivities: [
      {
        id: "bricks-rm",
        title: "RoboMaster备赛训练",
        when: "赛季周期内",
        note: "围绕RMU赛事进行机器人设计、制作与调试。",
      },
      {
        id: "bricks-tech",
        title: "技术组例会",
        when: "每周进行",
        note: "机械组、电控组、视觉算法组、宣运组各自开展专项训练。",
      },
    ],
    relatedCompetitions: [
      {
        id: "rmu",
        label: "RoboMaster机甲大师高校系列赛",
        summary: "教育部A类学科竞赛，国内顶尖大学生机器人赛事。",
      },
      {
        id: "electronic-design",
        label: "全国大学生电子设计竞赛",
        summary: "覆盖嵌入式系统、电路设计与算法综合方向。",
      },
      {
        id: "blue-bridge",
        label: "蓝桥杯（电子赛）",
        summary: "涵盖嵌入式、单片机等电子方向竞赛，机器人工作室重点参与赛道。",
      },
      {
        id: "other-mech-embedded-vision",
        label: "机械/嵌入式/视觉算法相关竞赛",
        summary: "持续关注并参与机械设计、嵌入式开发、视觉算法等方向的其他高水平赛事。",
      },
    ],
    advisorOrContact: {
      advisor: "徐鹏程",
      studentLead: "李同学",
      email: "1619907038@qq.com",
    },
    joinGuide: "欢迎机械、嵌入式、视觉算法、宣传运营各方向同学加入，详情关注招新公告。",
    themeColor: "from-rose-500/20 to-red-500/10",
  },
  {
    id: "acm-team",
    name: "ACM集训队",
    shortName: "ACM集训队",
    slogan: "算法为剑，代码为盾",
    description:
      "以算法为刃，用代码锤炼实战能力。主打ICPC/CCPC等高水平算法竞赛，依托系统化训练体系与学长指导，常态化开展算法训练与模拟赛，帮助同学们扎实掌握数据结构与算法知识，锤炼编程思维与问题解决能力，备战算法赛事，与全国高校同台竞技。",
    focusAreas: ["ICPC/CCPC", "算法竞赛", "数据结构", "团队协作", "程序设计"],
    flagshipActivities: [
      {
        id: "acm-training",
        title: "组队模拟赛与周度训练",
        when: "每周进行",
        note: "开展团队模拟赛与周度练习，锤炼快速解题与团队协作能力，适配竞赛节奏。",
      },
      {
        id: "acm-competition",
        title: "高水平算法赛事",
        when: "赛事周期内",
        note: "围绕ACM-ICPC、CCPC、天梯赛等高水平算法赛事，与全国高校同台比拼。",
      },
    ],
    relatedCompetitions: [
      {
        id: "acm-icpc",
        label: "ACM-ICPC/CCPC",
        summary: "高水平程序设计赛事，考验团队协作与快速编程解题能力。",
      },
      {
        id: "ladder",
        label: "团体程序设计天梯赛",
        summary: "全国性算法练习赛事，助力选手稳步提升解题能力与代码水平。",
      },
    ],
    advisorOrContact: {
      advisor: "万德焕",
      studentLead: "郭同学",
      email: "acm@college.example",
    },
    joinGuide: "欢迎对ACM-ICPC/CCPC比赛等算法比赛感兴趣的同学加入，关注每学期招新信息。",
    themeColor: "from-emerald-500/20 to-green-500/10",
  },
];
