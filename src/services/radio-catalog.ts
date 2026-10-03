import type { RadioStation } from "./radio-browser";

/**
 * Complementary catalog: stations whose streams were checked to answer with
 * real audio (content-type audio/*, >5 KB received, CORS allowed) on 2026-10-02.
 * Used to fill gaps in search results and as a fallback when every directory
 * server is unreachable.
 */
export const VERIFIED_CATALOG_DATE = "2026-10-02";

export const verifiedStations: RadioStation[] = ([
  {
    "id": "radio-executiva",
    "name": "Rádio Executiva FM 92.7 Goiânia",
    "favicon": "",
    "state": "Goiás",
    "city": "Goiânia",
    "frequency": "92.7",
    "homepage": "https://www.radioexecutiva.com.br/",
    "bitrate": 0,
    "codec": "HLS",
    "tags": [],
    "sources": [
      "https://live.ojc.com.br/c2f4/myStream.m3u8"
    ]
  },
  {
    "id": "cultura-fm-cuiaba-90-7",
    "name": "Cultura FM 90.7 Cuiabá",
    "favicon": "",
    "state": "Mato Grosso",
    "city": "Cuiabá",
    "frequency": "90.7",
    "homepage": "https://www.culturafmcuiaba.com.br/",
    "bitrate": 64,
    "codec": "AAC+",
    "tags": [],
    "sources": [
      "https://5a57bda70564a.streamlock.net/cultmthd/cultmthd.stream/playlist.m3u8"
    ]
  },
  {
    "id": "570cc99a-9159-4d91-9a8f-96ddb5b30797",
    "name": "Rádio Antena 1 94.7 FM",
    "favicon": "https://img.radios.com.br/radio/lg/radio9505_1574106966.jpg",
    "state": "Sao Paulo",
    "bitrate": 96,
    "codec": "AAC+",
    "tags": [
      "adult",
      "flashback"
    ],
    "sources": [
      "https://antenaone.crossradio.com.br/stream/1;"
    ]
  },
  {
    "id": "7ada8a81-5ae1-418c-8f18-51d2f38d86a4",
    "name": "Bossa Jazz Brasil",
    "favicon": "https://bossajazzbrasil.com/wp-content/uploads/2020/12/cropped-bjs-app-180x180.png",
    "state": "",
    "bitrate": 64,
    "codec": "AAC+",
    "tags": [
      "bossa nova",
      "jazz",
      "mpb"
    ],
    "sources": [
      "https://centova5.transmissaodigital.com:20104/live"
    ]
  },
  {
    "id": "bf64595a-eed4-49de-94e5-87c1bb813a74",
    "name": "Jovem Pan FM - Florianópolis - SC",
    "favicon": "https://jpimg.com.br/uploads/2024/02/avatar-florianopolis-rgb-500x500.png",
    "state": "Santa Catarina",
    "bitrate": 128,
    "codec": "AAC+",
    "tags": [
      "chr",
      "contemporary hits radio",
      "dance"
    ],
    "sources": [
      "https://live.paineldj.com.br/proxy/jfloripa?mp=/stream"
    ]
  },
  {
    "id": "35ac4203-2b03-4b57-93d6-3aeb5701d78f",
    "name": "Rádio Cidade Maracaju 104.3 FM",
    "favicon": "https://public-rf-upload.minhawebradio.net/250444/logo/c9f6c0e472e2023c1d2cf8744f78a973.png",
    "state": "Mato Grosso do Sul",
    "bitrate": 64,
    "codec": "AAC",
    "tags": [
      "chamame",
      "ecletic",
      "hits"
    ],
    "sources": [
      "https://servidor33-5.brlogic.com:7078/live"
    ]
  },
  {
    "id": "84a51775-4137-48c8-b72b-85f4b5edc7e5",
    "name": "Super Radio Tupi 96.5",
    "favicon": "",
    "state": "Rio de Janeiro",
    "bitrate": 32,
    "codec": "AAC",
    "tags": [
      "local news",
      "news talk",
      "variety"
    ],
    "sources": [
      "https://8923.brasilstream.com.br/stream"
    ]
  },
  {
    "id": "4c66701a-2486-421e-87c7-a53879b069c1",
    "name": "80 Hits Brasil",
    "favicon": "https://i.ibb.co/5x1yHdR0/LOGO2025.png",
    "state": "DF",
    "bitrate": 128,
    "codec": "AAC+",
    "tags": [
      "80's",
      "80s",
      "mpb"
    ],
    "sources": [
      "https://stm5.painelcast.com:7662/stream"
    ]
  },
  {
    "id": "f66f08c3-1616-4dd6-a54f-75aa29aa8249",
    "name": "Rádio Itatiaia 95.7 FM",
    "favicon": "https://img.radios.com.br/radio/lg/radio14_1646746883.jpeg",
    "state": "Minas Gerais",
    "bitrate": 64,
    "codec": "AAC",
    "tags": [
      "news",
      "soccer",
      "sports"
    ],
    "sources": [
      "https://8903.brasilstream.com.br/stream"
    ]
  },
  {
    "id": "ef07dbb2-1176-4b09-bb87-9e841300c3cf",
    "name": "Smooth Jazz Lounge",
    "favicon": "https://www.vip-radios.fm/favicon.ico",
    "state": "Sao Paulo (Brazil)",
    "bitrate": 128,
    "codec": "MP3",
    "tags": [
      "jazz",
      "smooth jazz",
      "smooth lounge"
    ],
    "sources": [
      "https://radio4.vip-radios.fm:18060/stream-128kmp3-SmoothJazzLounge"
    ]
  },
  {
    "id": "00bc4f1d-050c-49ae-bc42-a8aaa5d0ff5b",
    "name": "Sertaneja 106.7",
    "favicon": "https://assets.clubefm.com.br/uploads/site/logo/2/106-sertaneja-4fff3e1f118ab621432fa4d74136e042e86b6eedbabf561ded0dfd61123d980e.png",
    "state": "São Paulo",
    "bitrate": 128,
    "codec": "MP3",
    "tags": [
      "country",
      "sertanejo"
    ],
    "sources": [
      "https://sc4s.cdn.upx.com:8067/stream"
    ]
  },
  {
    "id": "2ca712c4-2d5f-4dbd-a2e3-1961136eec4e",
    "name": "Fita Cassete",
    "favicon": "https://img.radios.com.br/radio/lg/radio162745_1603505533.jpg",
    "state": "",
    "bitrate": 48,
    "codec": "AAC",
    "tags": [
      "adult",
      "adulta",
      "flashback"
    ],
    "sources": [
      "https://server01.ouvir.radio.br:8018/stream"
    ]
  },
  {
    "id": "9f0466be-b6b0-4f7c-baff-f64555494804",
    "name": "Groove Wave Lounge",
    "favicon": "https://www.groovewave.com/favicon.ico",
    "state": "Sao Paulo (Brazil)",
    "bitrate": 128,
    "codec": "MP3",
    "tags": [
      "ambient lounge",
      "jazz lounge",
      "lounge"
    ],
    "sources": [
      "https://stm1.srvif.com:7576/;"
    ]
  },
  {
    "id": "823e517b-82e0-447c-a8ca-2f6454e9d852",
    "name": "Rádio Arapuan 98.9 FM",
    "favicon": "https://www.arapuanfm.com.br/2023/images/site/logo.png",
    "state": "Paraiba",
    "bitrate": 128,
    "codec": "MP3",
    "tags": [
      "eclética",
      "hits"
    ],
    "sources": [
      "https://streaming.engelhosting.com.br:10036/stream"
    ]
  }
] as Omit<RadioStation, "verified">[]).map((s) => ({ ...s, verified: true }));

/** Alternative names people type for well-known brands (all normalized). */
export const stationAliases: Record<string, string[]> = {
  "cultura fm 90 7 cuiaba": ["cultura fm cuiaba", "cultura cuiaba", "cultura mt"],
  "antena 1": ["antena one", "antena1", "antena um"],
  "jovem pan": ["jp", "jovempan", "pan"],
  "band news": ["bandnews", "band"],
  "radio tupi": ["super radio tupi", "tupi"],
  "itatiaia": ["radio itatiaia"],
  "cbn": ["central brasileira de noticias"],
  "radio globo": ["globo"],
  "mix": ["radio mix", "mix fm"],
  "transamerica": ["trans america", "transamérica"],
  "nativa": ["nativa fm"],
};
