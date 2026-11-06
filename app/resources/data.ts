export interface Resource {
  isOfficial?: boolean
  name: string
  description: string
  hotline?: string
  email?: string
  hours?: string
  region?: string
  wechat?: string
  weibo?: string
}

export interface ResourceCategory {
  id: string
  icon: string
  title: string
  description: string
  resources: Resource[]
}

export const categories: ResourceCategory[] = [
  {
    id: 'hotlines',
    icon: '📞',
    title: '全国统一热线',
    description: '遇到紧急情况或需要即时帮助，可以拨打以下热线。',
    resources: [
      {
        name: '全国妇女维权热线',
        isOfficial: true,
        description: '全国妇联设立的妇女维权公益服务热线，提供法律咨询、心理疏导、婚姻家庭纠纷调解等服务。',
        hotline: '12338',
        hours: '各地妇联规定不同，多为工作时间',
        region: '全国',
      },
      {
        name: '报警电话',
        isOfficial: true,
        description: '遇到人身安全威胁时，请立即拨打报警电话。',
        hotline: '110',
        hours: '24小时',
        region: '全国',
      },
      {
        name: '法律援助中心热线',
        isOfficial: true,
        description: '提供法律咨询、诉讼代理和非诉讼代理等法律援助服务。',
        hotline: '12348',
        hours: '各地司法局规定不同，多为工作时间',
        region: '全国',
        wechat: '中国普法（各地司法行政公众号）',
      },
      {
        name: '儿童救助保护热线',
        isOfficial: true,
        description: '提供儿童救助保护相关政策法规咨询、儿童心理问题疏导、帮扶转介、受理儿童生活困难问题等服务。',
        hotline: '12349',
        hours: '各地民政部门规定不同',
        region: '试点地区（全国5省14市）',
      },
      {
        name: 'AVON雅芳-为平妇女支持热线',
        description: '为遭受家庭暴力和性别暴力的女性提供心理疏导、法律咨询等服务。',
        hotline: '+86 15117905157',
        email: 'equality-cn@hotmail.com',
        hours: '24小时，全年无休',
        region: '全国',
        wechat: '公众号：为平妇女权益支持',
      },
    ],
  },
  {
    id: 'legal-aid',
    icon: '⚖️',
    title: '法律援助机构',
    description: '提供免费法律咨询、代理诉讼等专业法律服务。',
    resources: [
      {
        name: '北京市千千律师事务所',
        description: '致力于维护妇女儿童权益、用法律推动性别平等的公益性律师事务所。前身为北京大学法学院妇女法律研究与服务中心，是中国第一家专门从事妇女法律援助及研究的公益性民间组织。',
        hotline: '010-84833270 / 010-84831639',
        email: 'ngo@woman-legalaid.org.cn',
        hours: '工作日 9:00-17:00',
        region: '全国',
        wechat: '公众号：北京市千千律师事务所',
      },
      {
        name: '北京市东城区源众家庭与社区发展服务中心',
        description: '5A级社会组织，拥有国内最专业的针对妇女儿童暴力（家庭暴力、性骚扰、性侵害）处理团队。志愿律师超200人，开通法律咨询热线及"家暴求助"小程序，服务超1万人次。十年来办理500余起维权案件。',
        hotline: '17701242202 / 15901337457',
        email: 'bjyuanzhong@126.com',
        hours: '工作日 9:00-17:00（热线 9:00-22:00）',
        region: '全国',
        wechat: '公众号：源众性别发展中心',
        weibo: '@源众反暴力热线',
      },
      {
        name: '深圳市维德志愿法律服务中心',
        description: '为受暴妇女儿童提供法律咨询。',
        hotline: '4000-343-580 / 18027652331',
        email: 'info@probonochina.org',
        hours: '工作时间',
        region: '咨询全国，诉讼深圳',
        wechat: '公众号：probonochina',
      },
    ],
  },
  {
    id: 'anti-violence',
    icon: '🛡️',
    title: '反家暴服务机构',
    description: '提供心理支持、社工陪伴、紧急庇护等综合性反暴力服务。',
    resources: [
      {
        name: '为平妇女权益机构',
        description: '提供综合服务，支持英语求助。通过服务和支持促进妇女和女童赋权，尤其是增强受暴力影响的妇女和女童的能力。',
        hotline: '15117905157 / 010-53399291',
        email: 'equality-cn@hotmail.com',
        hours: '24小时，全年无休',
        region: '全国',
        wechat: '公众号：为平妇女权益支持',
      },
      {
        name: '深圳市鹏星家庭暴力防护中心',
        description: '国内较早成立的专业反家暴社会工作服务机构。提供家庭暴力个案管理、受害人心理辅导、法律咨询、目睹儿童辅导、施暴者行为干预等综合服务。',
        hotline: '0755-25950003 / 18929315210',
        hours: '工作日 9:00-17:30（热线面向全国）',
        region: '广东为主，热线全国',
        wechat: '公众号：鹏星家暴防护中心',
      },
      {
        name: '北京红枫妇女心理咨询服务中心',
        description: '国内最早的针对妇女和性别暴力的心理支持热线。普及知识，提供心理咨询服务。',
        hotline: '010-68333388 / 010-64073800',
        hours: '工作日 9:00-17:00',
        region: '全国',
      },
      {
        name: '陕西家源汇社会工作服务中心',
        description: '提供综合社工服务，涉及婚姻家庭、反家暴、困境儿童与长者服务。',
        hotline: '029-87420063',
        hours: '工作日 9:00-17:30',
        region: '陕西为主，热线全国',
      },
      {
        name: '中国白丝带志愿者网络项目',
        description: '专注于推动男性参与消除针对妇女的暴力。免费为性别暴力的施暴者、有暴力倾向者提供行为改变的心理辅导与帮助，同时也为受暴人、暴力目击者提供心理咨询。',
        hotline: '4000110391',
        hours: '全周 08:00-22:00',
        region: '全国',
        wechat: '公众号：中国白丝带',
      },
      {
        name: '紫丝带妈妈',
        description: '为"抢夺、藏匿孩子"受害群体提供免费法律咨询、心理辅导等公益服务。',
        hours: '不定期',
        region: '全国',
        weibo: '@紫丝带妈妈的爱',
      },
    ],
  },
  {
    id: 'lgbtq',
    icon: '🌈',
    title: '多元性别支持',
    description: '为性与性别少数群体提供反暴力干预、心理支持等服务。',
    resources: [
      {
        name: '彩虹暴力终结所',
        description: '为性与性别少数社群提供性别暴力直接干预服务，包括针对性倾向、性别认同、性别表达的歧视和暴力。',
        hotline: '400-1166-308',
        email: 'tongyu.org@gmail.com',
        hours: '周一至周五 14:00-18:00',
        region: '全国',
        wechat: '公众号：同语（ID: tongyulalazixun）',
        weibo: '@同语CommonLanguage',
      },
      {
        name: '出色伙伴',
        description: '原同性恋亲友会，成立于2008年。鼓励性少数者实现自我认同，促进性少数者与其亲友间的理解沟通；向公众倡导性倾向平等。',
        hotline: '4000820211（亲子热线）/ 13602429004',
        hours: '亲子热线每天 20:30-22:30',
        region: '全国',
      },
      {
        name: '橘伴空间',
        description: '为多元性别女性群体提供互助与支持，并为遭遇性别暴力的伙伴提供帮助。',
        hours: '时间灵活',
        region: '东北地区',
        wechat: '公众号：橘伴空间 / 微信：orangespace2022',
      },
      {
        name: '武汉吾同计划',
        description: '开展LGBTQ+社群服务、公众教育与艾滋病防治工作，致力于宣传平等机会意识、推动多元性别教育。',
        hotline: '027-59225189',
        hours: '周一至周日 10:00-20:00',
        region: '线下武汉，线上全国',
        wechat: '公众号：吾同计划',
      },
      {
        name: '上海反家暴小组',
        description: '由志愿者自发组织，承接上海及周边地区性别暴力受害者个案支持。',
        email: 'eveshuanglin@gmail.com',
        hours: '灵活',
        region: '上海',
      },
    ],
  },
  {
    id: 'lawyers',
    icon: '👨‍⚖️',
    title: '公益律师',
    description: '以下律师在性别暴力、多元性别权益保护等领域具有丰富经验，可提供法律咨询。',
    resources: [
      {
        name: '刘明珂律师',
        description: '代理多起多元性别群体就业歧视案件、校园欺凌案件。协助数十位多元性别伙伴起草意定监护、遗嘱与财产协议等法律文书。',
        hotline: '18515228172',
        email: 'liumingke91@gmail.com',
        region: '北京',
      },
      {
        name: '赵虎律师（河北厚正律师事务所）',
        description: '自2016年起从事性少数普法工作，代理性少数权益案件。微信视频号提供免费线上法律咨询。',
        hotline: '18633935285',
        email: '316394175@qq.com',
        region: '石家庄',
      },
      {
        name: '韩林律师（河南昱之佳律师事务所）',
        description: '代理案件和解答咨询，进行普法讲课，代办意定监护公证。',
        hotline: '13523235471',
        email: '13523235471@163.com',
        region: '河南',
      },
      {
        name: '徐璐律师',
        description: '接触相关领域六年时间，办理过彩虹伴侣的意定监护。',
        hotline: '15872398599',
        email: '781494847@qq.com',
        region: '武汉',
      },
      {
        name: '芮欢月律师（上海九泽律师事务所）',
        description: '多次提供意定监护、形式婚姻、财产共有规划等非诉服务。承办上海首例女同性恋子女确认亲子关系纠纷案件。已解答400+与多元性别相关的法律问题。',
        hotline: '15872398599',
        email: '781494847@qq.com',
        region: '上海',
      },
      {
        name: '丁律师',
        description: '经办多起多元性别领域案件，包括首例同性伴侣意定监护、跨性别人士修改学历性别信息等。擅长伴侣关系、生育关系等法律问题。',
        hotline: '13247655070',
        email: 'dingyaqing@zhihenglawyer.com',
        region: '广州',
      },
      {
        name: '马律师',
        description: '曾代理杭州跨性别就业歧视案件，为遭受家暴的伙伴提供帮助，代理涉及多元性别群体的形婚、婚前协议、代孕、落户等案件。',
        hotline: '13918717065',
        email: '13918717065@139.com',
        region: '上海',
      },
      {
        name: '郑连豪律师（北京市盈科(广州)律师事务所）',
        description: '代理同性恋群体形婚离婚、赠与合同纠纷，艾滋病隐私权纠纷，跨性别人士网络暴力人格权纠纷等案件。',
        hotline: '18819450675',
        email: '917113063@qq.com',
        region: '广州',
      },
    ],
  },
  {
    id: 'shelter',
    icon: '🏠',
    title: '临时庇护与社区支持',
    description: '如需临时安全住所或社区层面的帮助，可联系以下渠道。',
    resources: [
      {
        name: '当地民政局临时庇护场所',
        isOfficial: true,
        description: '县级或设区的市级人民政府可单独或依托救助管理机构设立临时庇护场所，提供食宿等临时生活帮助、隐私保护、心理辅导及司法救助转介服务。',
        hotline: '12345（政务服务热线，可咨询当地庇护所信息）',
        region: '各地',
      },
      {
        name: '居民委员会 / 村民委员会',
        isOfficial: true,
        description: '家庭暴力受害人及其法定代理人、近亲属，可以向居民委员会、村民委员会投诉、反映或求助。有关单位接到投诉后应当给予帮助、处理。',
        region: '各地',
      },
      {
        name: '当地妇女联合会',
        isOfficial: true,
        description: '妇联是维护妇女合法权益的重要机构，可提供协调、呼吁等服务性工作。建议先想清楚自己的需求和目的，说明情况时抓住关键要点。',
        hotline: '12338',
        region: '各地',
      },
    ],
  },
]
