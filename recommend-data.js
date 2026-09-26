// 配装推荐数据 - 从recommend.html提取
// 无priority字段，渲染时按build_ids数组顺序默认排序（第一条=首选）
// build_ids引用builds-data.js中的id
const RECOMMEND_DATA = [
  { id:"rec_001", scene:"首领打桩", class:"野蛮人", build_ids:["build_016"], desc:"操作简单，输出稳定，适合大多数玩家" },
  { id:"rec_002", scene:"PVE推图", class:"野蛮人", build_ids:["build_016"], desc:"操作简单，输出稳定，适合大多数玩家" },
  { id:"rec_003", scene:"首领打桩", class:"野蛮人", build_ids:["build_015"], desc:"首领战特化，打桩伤害最高" },
  { id:"rec_004", scene:"PVE推图", class:"野蛮人", build_ids:["build_009"], desc:"范围清怪快，生存能力不错" },
  { id:"rec_005", scene:"PVP竞技", class:"野蛮人", build_ids:["build_008"], desc:"PK场强势，控制链完整" },
  { id:"rec_006", scene:"PVE推图", class:"野蛮人", build_ids:["build_007"], desc:"成型快，成本低，输出不错" },
  { id:"rec_007", scene:"首领打桩", class:"野蛮人", build_ids:["build_007"], desc:"成型快，成本低，输出不错" },
  { id:"rec_008", scene:"PVE推图", class:"野蛮人", build_ids:["build_010"], desc:"操作最简单，新手友好" },
  { id:"rec_009", scene:"首领打桩", class:"秘法师", build_ids:["build_002"], desc:"爆发最高，秒杀首领" },
  { id:"rec_010", scene:"PVE推图", class:"秘法师", build_ids:["build_005"], desc:"综合能力强，泛用性最高" },
  { id:"rec_011", scene:"首领打桩", class:"秘法师", build_ids:["build_005"], desc:"综合能力强，泛用性最高" },
  { id:"rec_012", scene:"PVE推图", class:"秘法师", build_ids:["build_004"], desc:"成本最低，新手首选" },
  { id:"rec_013", scene:"PVE推图", class:"秘法师", build_ids:["build_003"], desc:"爆发高，玩法独特" },
  { id:"rec_014", scene:"PVP竞技", class:"秘法师", build_ids:["build_003"], desc:"爆发高，玩法独特" },
  { id:"rec_015", scene:"PVP竞技", class:"秘法师", build_ids:["build_001"], desc:"PK强势，控制多" },
  { id:"rec_016", scene:"首领打桩", class:"秘法师", build_ids:["build_018"], desc:"持续输出高，首领战稳定" },
  { id:"rec_017", scene:"PVE推图", class:"游侠", build_ids:["build_017"], desc:"最新版本，输出最高" },
  { id:"rec_018", scene:"首领打桩", class:"游侠", build_ids:["build_017"], desc:"最新版本，输出最高" },
  { id:"rec_019", scene:"PVE推图", class:"游侠", build_ids:["build_014"], desc:"生存最强，成本低" },
  { id:"rec_020", scene:"首领打桩", class:"游侠", build_ids:["build_014"], desc:"生存最强，成本低" },
  { id:"rec_021", scene:"PVE推图", class:"游侠", build_ids:["build_011"], desc:"经典流派，经过验证" },
  { id:"rec_022", scene:"首领打桩", class:"游侠", build_ids:["build_011"], desc:"经典流派，经过验证" },
  { id:"rec_023", scene:"PVP竞技", class:"游侠", build_ids:["build_012"], desc:"PK生存最强，反伤恶心" },
  { id:"rec_024", scene:"PVE推图", class:"游侠", build_ids:["build_013"], desc:"最省心，站撸就行" }
];
