/** Presentation reference only. Sources and extension policy: docs/locomotive-nicknames.md. */
export const nicknameSources = {
  overview: { title: "Veřejná doprava — přehled přezdívek", url: "https://verejna-doprava.eu/zprezdivky.htm" },
  bardotka: { title: "ČD — Bardotky s elektrickým topením", url: "https://zeleznicar.cd.cz/zeleznicar/historie/pred-dvaceti-lety-se-objevily-bardotky-s-elektrickym-topenim/-1828/" },
  brejlovec: { title: "ČD — pronájem Brejlovců 754", url: "https://zeleznicar.cd.cz/zeleznicar/hlavni-zpravy/ceske-drahy-pronajmou-pkp-intercity-pet-brejlovcu-/-16926/" },
  eso: { title: "ČD — sériově vyráběná Esa", url: "https://seznam.cd.cz/zeleznicar/historie/pred-40-lety-poprve-vyjela-seriove-vyrabena-dvousystemova-esa/-37866/" },
  bastard: { title: "ČD — Bastardi v dálkovém provozu", url: "https://seznam.cd.cz/zeleznicar/zpravodajstvi/vysmivani-bastardi-stale-zachranuji-dalkovy-provoz-do-nemecka-/-1919/20%2C0%2C%2C/" },
  hektor: { title: "ČD — Velký Hektor", url: "https://zeleznicar.cd.cz/zeleznicar/historie/kdyz-z-male-lokomotivy-vyroste-velka/-30392/" },
  banan: { title: "ČD — Banány 150 a 151", url: "https://seznam.cd.cz/zeleznicar/provoz-a-technika/banany-miri-definitivne-do-vysluzby/-39140/" },
  vectron: { title: "ČD — Vectrony 193 a 384", url: "https://www.ceskedrahy.cz/en/predani-50-Vectronu-rady-384" },
  traxx: { title: "Alstom — Traxx 388 a 388.2", url: "https://www.alstom.com/cs/press-releases-news/2025/9/era-schvalila-palubni-system-etcs-pro-lokomotivy-traxx-universal-umoznila-tim-preshranicni-nakladni-provoz-ceskym-dopravcum" },
  desiro: { title: "ČD — Desiro Classic 642", url: "https://zeleznicar.cd.cz/assets/zeleznicar/zeleznicar_21_2014.pdf" },
  gtW: { title: "ČD — GTW 646 a RegioSpider 840/841", url: "https://zeleznicar.cd.cz/zeleznicar/provoz-a-technika/ceske-drahy-nakoupily-motorove-jednotky-stadler-gtw/-19882/21%2C0%2C%2C/" },
  panter: { title: "ČD — RegioPanter a InterPanter", url: "https://seznam.cd.cz/zeleznicar/zpravodajstvi/jarni-rozkvet-ve-zc-velim--dorazil-interpanter-i-nemecky-rekordman/-8636/20%2C0%2C%2C/" },
  pendolino: { title: "ČD — Pendolino, čelní vůz 681", url: "https://www.ceskedrahy.cz/tiskove-centrum/tiskove-zpravy/ceske-drahy-nechaji-opravit-poskozene-pendolino" },
  fox: { title: "ČD — RegioShark a RegioFox", url: "https://ceskedrahy.cz/tiskove-centrum/tiskove-zpravy/ceske-drahy-otevrely-novou-opravarenskou-halu-strediska-udrzby-v" },
  taurus: { title: "ČD — Taurus 1216", url: "https://seznam.cd.cz/zeleznicar/provoz-a-technika/prvni-ze-ctverice-lokomotiv-taurus-ma-novy-lak/-30176/21%2C0%2C%2C/" },
  zehlicka: { title: "ČD — Jihočeské Žehličky", url: "https://seznam.cd.cz/zeleznicar/historie/jihoceske-zehlicky-jsou-stale-pri-sile/-35265/" },
} as const;

export type LocomotiveNickname = {
  id: string;
  name: string;
  classes: readonly string[];
  operators: readonly string[];
  kind: "nickname" | "product";
  sources: readonly (keyof typeof nicknameSources)[];
};
const czech = ["ČD", "ČSD", "ČSD/ČD", "ČD Cargo", "RJ", "RegioJet"];
const shared = [...czech, "ZSSK", "ZSSK Cargo"];
function family(id: string, name: string, classes: string[], sources: LocomotiveNickname["sources"] = ["overview"],
  operators: string[] = czech, kind: LocomotiveNickname["kind"] = "nickname"): LocomotiveNickname {
  return { id, name, classes, sources, operators, kind };
}

// Groups share a display name, not necessarily an identical technical design.
// Match exact classes and operators; never infer a foreign class from a number prefix.
export const locomotiveNicknames: readonly LocomotiveNickname[] = [
  family("bobinka", "Bobinka", ["100"]),
  family("zehlicka", "Žehlička", ["110", "111", "113", "210"], ["zehlicka", "overview"]),
  family("ctyrkolak", "Čtyřkolák", ["121", "123"]),
  family("hrbata", "Hrbatá", ["130"]),
  family("bobina", "Bobina", ["140", "141"]),
  family("banan", "Banán", ["150", "150.2", "151"], ["banan"]),
  family("persing", "Peršing", ["162", "163"], ["overview"], shared),
  family("asynchron", "Asynchron", ["169"]),
  family("sestikolak", "Šestikolák", ["181", "182", "183"], ["overview"], shared),
  family("laminatka", "Laminátka", ["230", "240"], ["overview"], shared),
  family("plechac", "Plecháč", ["242"]),
  family("princezna", "Princezna", ["263"], ["overview"], shared),
  family("gorila", "Gorila", ["350"], ["overview"], shared),
  family("eso", "Eso", ["362", "363"], ["eso"], shared),
  family("bastard", "Bastard", ["371", "372"], ["bastard"]),
  family("messerschmitt", "Messerschmitt", ["380"]),
  family("zabotlam", "Žabotlam", ["451", "452"]),
  family("tornado", "Tornádo", ["460", "560"], ["overview"], shared),
  family("kraken", "Kraken", ["470"]),
  family("esus", "Ešus", ["471"]),
  family("male-lego", "Malé lego", ["704"]),
  family("velke-lego", "Velké lego", ["708"]),
  family("lachtan", "Lachtan", ["714"]),
  family("maly-hektor", "Malý Hektor", ["720"], ["overview"], shared),
  family("velky-hektor", "Velký Hektor", ["721"], ["hektor"], shared),
  family("spageta", "Špageta", ["731"]),
  family("pilstyk", "Pilštyk", ["735"], ["overview"], shared),
  family("kocour", "Kocour", ["742"], ["overview"], shared),
  family("elektronik", "Elektronik", ["743"]),
  family("bardotka", "Bardotka", ["749", "751", "T478.1"], ["bardotka", "overview"], shared),
  family("brejlovec", "Brejlovec", ["750", "753", "754", "T478.4"], ["brejlovec", "overview"], shared),
  family("cmelak", "Čmelák", ["770", "771"], ["overview"], shared),
  family("sergej", "Sergej", ["781"], ["overview"], shared),
  family("orchestrion", "Orchestrion", ["809", "810", "811"]),
  family("esmeralda", "Esmeralda", ["812"]),
  family("singrovka", "Singrovka", ["820"]),
  family("kredenc", "Kredenc", ["830"]),
  family("kvatro", "Kvatro", ["842"]),
  family("rakev", "Rakev", ["843"]),
  family("hydra", "Hydra", ["850", "851", "852", "854"]),
  family("chrochtadlo", "Chrochtadlo", ["860"]),
  family("albatros", "Albatros", ["498.0", "498.1"], ["overview"], shared),
  family("vectron", "Vectron", ["193", "384"], ["vectron"], czech, "product"),
  family("traxx", "Traxx", ["388", "388.2"], ["traxx"], czech, "product"),
  family("desiro", "Desiro", ["642"], ["desiro"], [...czech, "DB", "Vogtlandbahn", "DLB"], "product"),
  family("gtw", "Stadler GTW", ["646"], ["gtW"], czech, "product"),
  family("regiopanter", "RegioPanter", ["440", "640", "650"], ["panter"], czech, "product"),
  family("interpanter", "InterPanter", ["660"], ["panter"], czech, "product"),
  family("pendolino", "Pendolino", ["680", "681"], ["pendolino", "overview"], czech, "product"),
  family("regionova", "Regionova", ["814"], ["overview"], czech, "product"),
  family("regiospider", "RegioSpider", ["840", "841"], ["gtW"], czech, "product"),
  family("regioshark", "RegioShark", ["844"], ["fox"], czech, "product"),
  family("regiofox", "RegioFox", ["847"], ["fox"], czech, "product"),
  family("taurus", "Taurus", ["1216"], ["taurus"], [...czech, "ÖBB"], "product"),
];

export function locomotiveNickname(series: string, operator: string | null): string | undefined {
  return locomotiveNicknames.find(entry => entry.classes.includes(series) && entry.operators.includes(operator?.trim() || ""))?.name;
}
