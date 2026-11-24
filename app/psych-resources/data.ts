export interface PsychResource {
    title: string
    description: string
    type: 'book' | 'article' | 'website' | 'guide'
    url: string
    tags: string[]
    author?: string
}

export interface PsychResourceCategory {
    id: string
    title: string
    description: string
    resources: PsychResource[]
}

export const psychResources: PsychResourceCategory[] = [
    {
        id: 'understanding-dv',
        title: '认识家庭暴力',
        description: '了解家暴的定义、形式与规律，识别你所经历的是否属于家暴。',
        resources: [
            // {
            //     title: '家暴不是“家事”',
            //     description: '关于家庭暴力定义、类型与法律认定的官方说明，含《反家庭暴力法》要点解读。',
            //     type: 'guide',
            //     url: 'https://www.spp.gov.cn/spp/zdgz/202411/t20241126_674273.shtml',
            //     tags: ['法律基础', '定义'],
            //     author: '检察日报-明镜周刊-史兆琨',
            // },
            {
                title: '最高法发布2025年中国反家暴典型案例',
                description: '最高人民法院新闻局发布了2025年中国反家庭暴力典型案例，涵盖不同类型的家暴情形及司法处理结果，帮助公众理解法律实践中的家暴认定与保护措施。',
                type: 'article',
                url: 'https://www.court.gov.cn/zixun/xiangqing/482111.html',
                tags: ['案例分析', '法律实践'],
                author: '最高人民法院新闻局',
            },
            {
                title: '暴力循环及其局限（繁体中文）',
                description: '介绍紧张、暴力与和好等常见阶段，供理解部分暴力关系；并非每段关系都会经历完整循环。',
                type: 'article',
                url: 'https://www.dvp.ntpc.gov.tw/home.jsp?id=aa967983e02a861f',
                tags: ['关系规律', '认识暴力'],
                author: '新北市政府家庭暴力暨性侵害防治中心',
            },
            {
                title: '什么是强制控制？（英文）',
                description: '通过孤立、威胁、经济限制等例子认识控制行为；页面涉及的英国法律背景不用于判断其他地区法律。',
                type: 'article',
                url: 'https://womensaid.org.uk/information-support/what-is-domestic-abuse/coercive-control/',
                tags: ['情感暴力', '识别'],
                author: 'Women’s Aid',
            },
        ],
    },
    {
        id: 'trauma-recovery',
        title: '创伤疗愈与心理健康',
        description: '理解创伤对心理与身体的影响，找到属于你的疗愈路径。',
        resources: [
            {
                title: '《身体从未忘记》（The Body Keeps the Score）',
                description: '世界顶级创伤专家 Bessel van der Kolk 的经典著作，解释创伤如何影响大脑与身体，以及多种实证疗愈方法。',
                type: 'book',
                url: 'https://book.douban.com/subject/26796536/',
                tags: ['创伤', '疗愈', '推荐'],
                author: 'Bessel van der Kolk',
            },
            {
                title: '《创伤与复原》（Trauma and Recovery）',
                description: 'Judith Herman 的权威著作，专门讨论家庭暴力、性暴力等复杂创伤的恢复过程，是心理咨询领域的重要参考。',
                type: 'book',
                url: 'https://book.douban.com/subject/26721477/',
                tags: ['创伤', '复杂创伤', '推荐'],
                author: 'Judith Herman',
            },
            {
                title: '了解创伤后应激障碍（PTSD）（英文）',
                description: '介绍创伤后的常见反应、PTSD症状及求助方向，用于了解信息，不作为在线自我诊断。',
                type: 'guide',
                url: 'https://www.nimh.nih.gov/health/publications/post-traumatic-stress-disorder-ptsd',
                tags: ['创伤', '心理健康'],
                author: '美国国家心理健康研究所（NIMH）',
            },
            {
                title: '压力应对图解指南（含繁体中文版）',
                description: '提供着陆、觉察与按价值行动等压力应对练习；从官方发布页选择适合的语言版本。',
                type: 'guide',
                url: 'https://www.who.int/publications/i/item/9789240003927',
                tags: ['压力应对', '练习'],
                author: '世界卫生组织（WHO）',
            },
        ],
    },
    {
        id: 'safety-planning',
        title: '安全规划与离开准备',
        description: '在考虑离开或保护自己时，提前规划可以大幅提升安全性。',
        resources: [
            {
                title: '制定适合自己的安全计划（英文）',
                description: '根据个人处境考虑生活中的安全安排，包含互动式安全计划入口；是否离开及何时行动由个人条件决定。',
                type: 'guide',
                url: 'https://www.thehotline.org/plan-for-safety/create-your-personal-safety-plan/',
                tags: ['安全计划', '准备'],
                author: '美国全国家庭暴力热线（The Hotline）',
            },
            {
                title: '技术安全计划：给幸存者的指南（英文）',
                description: '介绍设备、账户与位置等技术风险，以及规划安全调整的原则；不将立即修改所有设置作为统一要求。',
                type: 'guide',
                url: 'https://www.techsafety.org/resources-survivors/technology-safety-plan',
                tags: ['数字安全', '隐私'],
                author: 'NNEDV Safety Net Project',
            },
            {
                title: '离开暴力关系时的安全考虑（英文）',
                description: '讨论离开过程的安全安排和现实支持；不鼓励当面对质，也不把离开当作所有人的立即任务。',
                type: 'article',
                url: 'https://www.thehotline.org/resources/leaving-an-abusive-relationship/',
                tags: ['分离安全', '支持'],
                author: '美国全国家庭暴力热线（The Hotline）',
            },
        ],
    },
    {
        id: 'children-parenting',
        title: '儿童保护与亲子关系',
        description: '家暴环境对儿童的影响，以及如何在困难环境中支持孩子。',
        resources: [
            {
                title: '家庭暴力可能怎样影响儿童？（英文）',
                description: '面向照护者介绍家庭暴力对儿童的不同影响，以及与儿童反应相关的环境因素。',
                type: 'article',
                url: 'https://www.nctsn.org/resources/children-and-domestic-violence-how-does-domestic-violence-affect-children',
                tags: ['儿童', '创伤'],
                author: '美国国家儿童创伤应激网络（NCTSN）',
            },
            {
                title: '倾听孩子并与其谈论家庭暴力（英文）',
                description: '为照护者提供倾听和谈话建议，帮助儿童表达感受并减少对暴力的自责。',
                type: 'guide',
                url: 'https://www.nctsn.org/resources/children-and-domestic-violence-listening-and-talking-your-child-about-domestic-violence',
                tags: ['亲子沟通', '儿童'],
                author: '美国国家儿童创伤应激网络（NCTSN）',
            },
        ],
    },
    {
        id: 'legal-knowledge',
        title: '法律知识与权利意识',
        description: '了解你在法律层面拥有的权利与保护。',
        resources: [
            {
                title: '《中华人民共和国反家庭暴力法》全文',
                description: '2016年施行的中国反家庭暴力专项立法，包括定义、人身安全保护令、强制报告义务等核心条款。',
                type: 'website',
                url: 'https://www.spp.gov.cn/zdgz/201512/t20151228_109929.shtml',
                tags: ['法律', '政策'],
                author: '全国人民代表大会',
            },
            {
                title: '《中华人民共和国妇女权益保障法》全文',
                description: '2022年修订的中国妇女权益保障专项立法，包括妇女在家庭、工作、教育等方面的权利保障。',
                type: 'website',
                url: 'https://www.spp.gov.cn/spp/fl/202210/t20221030_591251.shtml',
                tags: ['法律', '政策'],
                author: '全国人民代表大会',
            },
            {
                title: '人身安全保护令申请书模板',
                description: '整理申请人、被申请人和家暴事实等关键信息，填写后生成保护令申请书文档。',
                type: 'guide',
                url: '/docs-toolkit/protection-order',
                tags: ['保护令', '法律', '填写模板'],
            },
            {
                title: '家庭暴力告诫书模板',
                description: '了解公安机关告诫书的内容结构，填写家暴记录和证据线索后生成参考文档。',
                type: 'guide',
                url: '/docs-toolkit/admonishment-letter',
                tags: ['告诫书', '法律', '填写模板'],
            },
            {
                title: '反家庭暴力典型案例发布会答记者问',
                description: '2026年3月发布，说明家暴案件中的离婚、子女抚养、财产和损害赔偿等司法处理问题。',
                type: 'article',
                url: 'https://www.court.gov.cn/zixun/xiangqing/496261.html',
                tags: ['法律', '权益'],
                author: '最高人民法院',
            },
        ],
    },
    {
        id: 'support-communities',
        title: '支持社群与国际资源',
        description: '你不是孤单的。这些社群和平台提供同伴支持与专业资源。',
        resources: [
            {
                title: '北京为平',
                description: '为性暴力与家庭暴力幸存者提供同伴支持与资源的非营利网站，含论坛、文章与热线索引。',
                type: 'website',
                url: 'http://www.equality-beijing.org/index.aspx',
                tags: ['反家暴倡议', '同伴支持'],
            },
            {
                title: 'Pandora\'s Project（英文）',
                description: '为性暴力与家庭暴力幸存者提供同伴支持与资源的非营利网站，含论坛、文章与热线索引。',
                type: 'website',
                url: 'https://pandys.org/',
                tags: ['同伴支持', '英文'],
            },
            {
                title: '国际家庭暴力热线网络',
                description: '汇集全球各国反家暴组织与热线的目录，适合身处海外或有国际联系需求的使用者。',
                type: 'website',
                url: 'https://www.hotpeachpages.net/',
                tags: ['国际', '热线'],
            },
            {
                title: '白丝带项目（White Ribbon）',
                description: '由男性主导的反对性别暴力倡导项目，提供教育资源、公益活动与倡导工具。',
                type: 'website',
                url: 'https://www.whiteribbon.ca/',
                tags: ['倡导', '男性视角'],
            },
        ],
    },
]
