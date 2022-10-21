import unti from "webuntis";
import fs from "fs";
import moment from "moment";

const untis = new unti.WebUntisSecretAuth(
  process.env.UNTIS_SCHOOL!,
  process.env.UNTIS_USER!,
  process.env.UNTIS_SECRETE!,
  process.env.UNTIS_BASE_URL!
);

// const teachers = [
//   {
//     id: 2472,
//     name: "ack",
//     foreName: "",
//     longName: "Ackermann Manuela",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3224,
//     name: "AEL",
//     foreName: "",
//     longName: "Aellig Fabian",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2477,
//     name: "aes",
//     foreName: "",
//     longName: "Aeschlimann Peter",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 3229,
//     name: "AKS",
//     foreName: "",
//     longName: "Aksoy Seval",
//     title: "CH",
//     active: true,
//     dids: [
//       {
//         id: 60,
//       },
//       {
//         id: 105,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3234,
//     name: "ALB",
//     foreName: "",
//     longName: "Albonico Daniela",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3239,
//     name: "ALF",
//     foreName: "",
//     longName: "Allaf Mourad",
//     title: "HI",
//     active: true,
//     dids: [
//       {
//         id: 109,
//       },
//       {
//         id: 110,
//       },
//       {
//         id: 112,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2482,
//     name: "ams",
//     foreName: "",
//     longName: "Amstutz Andrée-Anne",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 3244,
//     name: "ANA",
//     foreName: "",
//     longName: "Anastasia Sara",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3249,
//     name: "AND",
//     foreName: "",
//     longName: "Andonie Georges",
//     title: "PY",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2487,
//     name: "asc",
//     foreName: "",
//     longName: "Aschwanden Mirjam",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3259,
//     name: "AUR",
//     foreName: "",
//     longName: "Aubry Eloïse",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3264,
//     name: "AUS",
//     foreName: "",
//     longName: "Aurousseau Mathieu",
//     title: "PY",
//     active: true,
//     dids: [
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2492,
//     name: "aut",
//     foreName: "",
//     longName: "Aubert Tobias",
//     title: "IN",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 156,
//       },
//     ],
//   },
//   {
//     id: 3269,
//     name: "BAE",
//     foreName: "",
//     longName: "Baechler Philippe",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3274,
//     name: "BAI",
//     foreName: "",
//     longName: "Bassi Frank",
//     title: "ED",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3279,
//     name: "BAR",
//     foreName: "",
//     longName: "Bargiela Maria-Carmen",
//     title: "ES",
//     active: true,
//     dids: [
//       {
//         id: 107,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2497,
//     name: "bat",
//     foreName: "",
//     longName: "Batiste Laurent",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 2502,
//     name: "bau",
//     foreName: "",
//     longName: "Bauer Pascal",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//       {
//         id: 131,
//       },
//     ],
//   },
//   {
//     id: 2506,
//     name: "bec",
//     foreName: "",
//     longName: "Bechler Corinne",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 2511,
//     name: "bee",
//     foreName: "",
//     longName: "Beer Alexandra",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 128,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3284,
//     name: "BEG",
//     foreName: "",
//     longName: "Berger Marion",
//     title: "AV",
//     active: true,
//     dids: [
//       {
//         id: 103,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3289,
//     name: "BEH",
//     foreName: "",
//     longName: "Becher Lorenz",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3294,
//     name: "BEN",
//     foreName: "",
//     longName: "Benoit Laetitia",
//     title: "PH",
//     active: true,
//     dids: [
//       {
//         id: 117,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3299,
//     name: "BEP",
//     foreName: "",
//     longName: "Beretta-Piccoli Cédric",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3304,
//     name: "BER",
//     foreName: "",
//     longName: "Berberat Nicolas",
//     title: "ED",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2516,
//     name: "bic",
//     foreName: "",
//     longName: "Bichsel Beat",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 3309,
//     name: "BIE",
//     foreName: "",
//     longName: "Bitterli Daniel",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3314,
//     name: "BIG",
//     foreName: "",
//     longName: "Bigler-Tillison Jane",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2521,
//     name: "bih",
//     foreName: "",
//     longName: "Bichsel Trees Isabelle",
//     title: "I",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//       {
//         id: 135,
//       },
//     ],
//   },
//   {
//     id: 2526,
//     name: "bim",
//     foreName: "",
//     longName: "Bischof Martin",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2531,
//     name: "bir",
//     foreName: "",
//     longName: "Birchler Patrick",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 2532,
//     name: "bis",
//     foreName: "",
//     longName: "Bischoff Bettina",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 3319,
//     name: "BJO",
//     foreName: "",
//     longName: "Boillat Johann",
//     title: "GE",
//     active: true,
//     dids: [
//       {
//         id: 109,
//       },
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3324,
//     name: "BLO",
//     foreName: "",
//     longName: "Bloch Michaël",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2537,
//     name: "blu",
//     foreName: "",
//     longName: "Blum-Möri Colette",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3326,
//     name: "BOD",
//     foreName: "",
//     longName: "Bonadei Lucas",
//     title: "ED",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2542,
//     name: "boh",
//     foreName: "",
//     longName: "Bosshard David",
//     title: "BG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 122,
//       },
//     ],
//   },
//   {
//     id: 3331,
//     name: "BOL",
//     foreName: "",
//     longName: "Bosch Lucienne",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3336,
//     name: "BOM",
//     foreName: "",
//     longName: "Bolay Morgane",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3341,
//     name: "BON",
//     foreName: "",
//     longName: "Bongard Myriam",
//     title: "HI",
//     active: true,
//     dids: [
//       {
//         id: 107,
//       },
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2547,
//     name: "bop",
//     foreName: "",
//     longName: "Boppart-Gygax Franziska",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 128,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 2552,
//     name: "bot",
//     foreName: "",
//     longName: "Boscato Aurora",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 3346,
//     name: "BOU",
//     foreName: "",
//     longName: "Bourquin Daniel",
//     title: "HI",
//     active: true,
//     dids: [
//       {
//         id: 110,
//       },
//       {
//         id: 117,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2557,
//     name: "bra",
//     foreName: "",
//     longName: "Braga Stefanie",
//     title: "I",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 135,
//       },
//     ],
//   },
//   {
//     id: 3351,
//     name: "BRE",
//     foreName: "",
//     longName: "Bregy Isabelle",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2562,
//     name: "brg",
//     foreName: "",
//     longName: "Bürge David",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 2567,
//     name: "brs",
//     foreName: "",
//     longName: "Braunschweig Rahel",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 2572,
//     name: "bsc",
//     foreName: "",
//     longName: "Bösch Claudia",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2577,
//     name: "bsg",
//     foreName: "",
//     longName: "Businger Silvia",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 2582,
//     name: "bsl",
//     foreName: "",
//     longName: "Basile Tiziano",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 2587,
//     name: "bue",
//     foreName: "",
//     longName: "Bühler Benedikt",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//       {
//         id: 131,
//       },
//     ],
//   },
//   {
//     id: 2592,
//     name: "bui",
//     foreName: "",
//     longName: "Bütikofer Stefan",
//     title: "G",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//       {
//         id: 154,
//       },
//     ],
//   },
//   {
//     id: 2597,
//     name: "bun",
//     foreName: "",
//     longName: "Büschlen Noomi",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2602,
//     name: "but",
//     foreName: "",
//     longName: "Bütikofer Jonathan",
//     title: "GG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//       {
//         id: 128,
//       },
//     ],
//   },
//   {
//     id: 3356,
//     name: "CAL",
//     foreName: "",
//     longName: "Carlucci Alba",
//     title: "IT",
//     active: true,
//     dids: [
//       {
//         id: 113,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3361,
//     name: "CAN",
//     foreName: "",
//     longName: "Carnal Marie-Jeanne",
//     title: "ICA",
//     active: true,
//     dids: [
//       {
//         id: 111,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3366,
//     name: "CAP",
//     foreName: "",
//     longName: "Canepa Kevin",
//     title: "ICA",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 111,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2607,
//     name: "car",
//     foreName: "",
//     longName: "Carl Patricia",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 3371,
//     name: "CAU",
//     foreName: "",
//     longName: "Caggiula Donato",
//     title: "ED",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2612,
//     name: "cey",
//     foreName: "",
//     longName: "Ceyran Nardo",
//     title: "GG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 128,
//       },
//     ],
//   },
//   {
//     id: 3376,
//     name: "CHA",
//     foreName: "",
//     longName: "Charpilloz Annie",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3381,
//     name: "CHE",
//     foreName: "",
//     longName: "Chevalley Albert",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3386,
//     name: "CHL",
//     foreName: "",
//     longName: "Cheminel Thomas",
//     title: "CH",
//     active: true,
//     dids: [
//       {
//         id: 105,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3391,
//     name: "CHM",
//     foreName: "",
//     longName: "Chalon Mélanie",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3396,
//     name: "CHR",
//     foreName: "",
//     longName: "Christe Régine",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2617,
//     name: "cla",
//     foreName: "",
//     longName: "Clausen Stefanie",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 3401,
//     name: "CLN",
//     foreName: "",
//     longName: "Clénin Vanessa",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2622,
//     name: "cos",
//     foreName: "",
//     longName: "Costantea Ioana",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 3406,
//     name: "CRI",
//     foreName: "",
//     longName: "Criblez Robert",
//     title: "AV",
//     active: true,
//     dids: [
//       {
//         id: 103,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3411,
//     name: "CRT",
//     foreName: "",
//     longName: "Cristian Barbara",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 114,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2627,
//     name: "dae",
//     foreName: "",
//     longName: "Däppen Gerhard",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 3416,
//     name: "DEB",
//     foreName: "",
//     longName: "Desboeufs Jean-Claude",
//     title: "PP",
//     active: true,
//     dids: [
//       {
//         id: 117,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3421,
//     name: "DEH",
//     foreName: "",
//     longName: "Degueldre Henri",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3426,
//     name: "DEL",
//     foreName: "",
//     longName: "Delémont Yan",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3431,
//     name: "DES",
//     foreName: "",
//     longName: "De Salis Gauthier",
//     title: "PH",
//     active: true,
//     dids: [
//       {
//         id: 110,
//       },
//       {
//         id: 117,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3436,
//     name: "DIP",
//     foreName: "",
//     longName: "Dippon Sabine",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2632,
//     name: "dis",
//     foreName: "",
//     longName: "Diserens Daniel",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 3441,
//     name: "DRA",
//     foreName: "",
//     longName: "Drapé Cosette",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3446,
//     name: "DRO",
//     foreName: "",
//     longName: "Droz-dit-Busset Gwennaëlle",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2637,
//     name: "drs",
//     foreName: "",
//     longName: "Dressler Angela",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 2642,
//     name: "dsz",
//     foreName: "",
//     longName: "D’Souza Lea",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 2647,
//     name: "duc",
//     foreName: "",
//     longName: "Dumitru Cristina",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 2652,
//     name: "egr",
//     foreName: "",
//     longName: "Egger Matthias",
//     title: "BG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 122,
//       },
//     ],
//   },
//   {
//     id: 3451,
//     name: "EIG",
//     foreName: "",
//     longName: "Eigeldinger Sylvie",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 105,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3456,
//     name: "EIS",
//     foreName: "",
//     longName: "Eisinger Julian",
//     title: "MUS",
//     active: true,
//     dids: [
//       {
//         id: 116,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3461,
//     name: "ENG",
//     foreName: "",
//     longName: "Englert Nathalie",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2657,
//     name: "fae",
//     foreName: "",
//     longName: "Fässler Philipp",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 3466,
//     name: "FAM",
//     foreName: "",
//     longName: "Fanger Melanie",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2662,
//     name: "fan",
//     foreName: "",
//     longName: "Fankhauser Regula",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 3471,
//     name: "FDZ",
//     foreName: "",
//     longName: "Fernandez Diego",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 105,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3476,
//     name: "FEI",
//     foreName: "",
//     longName: "Ferretti Anna",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2667,
//     name: "fer",
//     foreName: "",
//     longName: "Fernandez Avelina",
//     title: "S",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 133,
//       },
//     ],
//   },
//   {
//     id: 2672,
//     name: "fle",
//     foreName: "",
//     longName: "Fleury Diane",
//     title: "S",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//       {
//         id: 133,
//       },
//     ],
//   },
//   {
//     id: 3481,
//     name: "FRA",
//     foreName: "",
//     longName: "Fraitag Nathalie",
//     title: "CH",
//     active: true,
//     dids: [
//       {
//         id: 105,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2674,
//     name: "fre",
//     foreName: "",
//     longName: "Frei Cornelia",
//     title: "MU",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 138,
//       },
//     ],
//   },
//   {
//     id: 3486,
//     name: "FRI",
//     foreName: "",
//     longName: "Froidevaux Céline",
//     title: "AV",
//     active: true,
//     dids: [
//       {
//         id: 103,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2676,
//     name: "frn",
//     foreName: "",
//     longName: "Frank Manuel",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 2681,
//     name: "fro",
//     foreName: "",
//     longName: "Fröhlin Liechti Stephanie",
//     title: "BG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 122,
//       },
//     ],
//   },
//   {
//     id: 2686,
//     name: "fry",
//     foreName: "",
//     longName: "Freymond Isabelle",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 2691,
//     name: "fux",
//     foreName: "",
//     longName: "Fux Sabine",
//     title: "PP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 154,
//       },
//     ],
//   },
//   {
//     id: 2696,
//     name: "gab",
//     foreName: "",
//     longName: "Gabathuler Riccarda",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2699,
//     name: "gah",
//     foreName: "",
//     longName: "Gahl Peter",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 2704,
//     name: "gbr",
//     foreName: "",
//     longName: "Gerber Christa",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 2709,
//     name: "geb",
//     foreName: "",
//     longName: "Gerber Melanie",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 2714,
//     name: "gee",
//     foreName: "",
//     longName: "Gerber Nadine",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 2719,
//     name: "gef",
//     foreName: "",
//     longName: "Gerber Fabian",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 128,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3491,
//     name: "GEH",
//     foreName: "",
//     longName: "Gehin Natacha",
//     title: "PY",
//     active: true,
//     dids: [
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3496,
//     name: "GEN",
//     foreName: "",
//     longName: "Genzoni-Breitenmoser Karin",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3501,
//     name: "GET",
//     foreName: "",
//     longName: "Gerber Thomas",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 117,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3506,
//     name: "GEV",
//     foreName: "",
//     longName: "Gerber Vital",
//     title: "PH",
//     active: true,
//     dids: [
//       {
//         id: 117,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3511,
//     name: "GHI",
//     foreName: "",
//     longName: "Ghizdavu Pellascio Simona",
//     title: "CH",
//     active: true,
//     dids: [
//       {
//         id: 105,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3516,
//     name: "GIG",
//     foreName: "",
//     longName: "Gigon Michel",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2724,
//     name: "gil",
//     foreName: "",
//     longName: "Gilgen Cornelia",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 3521,
//     name: "GIO",
//     foreName: "",
//     longName: "Gigon Lucas",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3526,
//     name: "GLA",
//     foreName: "",
//     longName: "Glauser Annick",
//     title: "AV",
//     active: true,
//     dids: [
//       {
//         id: 103,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3531,
//     name: "GLO",
//     foreName: "",
//     longName: "Gloor Nathalie",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3536,
//     name: "GOU",
//     foreName: "",
//     longName: "Gouget Anne",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3541,
//     name: "GRA",
//     foreName: "",
//     longName: "Gray Camille",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3546,
//     name: "GRC",
//     foreName: "",
//     longName: "Grosjean Claire",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3551,
//     name: "GRJ",
//     foreName: "",
//     longName: "Grosjean Claude",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 4003,
//     name: "GRQ",
//     foreName: "",
//     longName: "Grosjean Quentin",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3556,
//     name: "GRR",
//     foreName: "",
//     longName: "Gerber Clément",
//     title: "AV",
//     active: true,
//     dids: [
//       {
//         id: 103,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3561,
//     name: "GRS",
//     foreName: "",
//     longName: "Grossenbacher Milène",
//     title: "GE",
//     active: true,
//     dids: [
//       {
//         id: 109,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3566,
//     name: "GUA",
//     foreName: "",
//     longName: "Guerry Alicia",
//     title: "HI",
//     active: true,
//     dids: [
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3571,
//     name: "GUT",
//     foreName: "",
//     longName: "Gurtner Dimitri",
//     title: "ICA",
//     active: true,
//     dids: [
//       {
//         id: 111,
//       },
//       {
//         id: 112,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2729,
//     name: "has",
//     foreName: "",
//     longName: "Hauser Damaris",
//     title: "GG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 128,
//       },
//     ],
//   },
//   {
//     id: 3576,
//     name: "HAU",
//     foreName: "",
//     longName: "Hauert Siegfried",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2734,
//     name: "her",
//     foreName: "",
//     longName: "Herzog Anita",
//     title: "WR",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 134,
//       },
//     ],
//   },
//   {
//     id: 3581,
//     name: "HES",
//     foreName: "",
//     longName: "Hersperger Etienne",
//     title: "MUS",
//     active: true,
//     dids: [
//       {
//         id: 116,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2739,
//     name: "hfr",
//     foreName: "",
//     longName: "Hofer Balthasar",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//       {
//         id: 156,
//       },
//     ],
//   },
//   {
//     id: 2744,
//     name: "hib",
//     foreName: "",
//     longName: "Hilber Claire",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 154,
//       },
//     ],
//   },
//   {
//     id: 2749,
//     name: "hil",
//     foreName: "",
//     longName: "Hiltbrunner Roger",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2754,
//     name: "hir",
//     foreName: "",
//     longName: "Hirschi Daniel",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 2759,
//     name: "hml",
//     foreName: "",
//     longName: "Hammel Pascal",
//     title: "MU",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 138,
//       },
//     ],
//   },
//   {
//     id: 3586,
//     name: "HOC",
//     foreName: "",
//     longName: "Hochuli Patrick",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2762,
//     name: "hom",
//     foreName: "",
//     longName: "Hoffmann Simone",
//     title: "BG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 122,
//       },
//     ],
//   },
//   {
//     id: 2766,
//     name: "hri",
//     foreName: "",
//     longName: "Hauri Thomas",
//     title: "WR",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 134,
//       },
//     ],
//   },
//   {
//     id: 2771,
//     name: "hrl",
//     foreName: "",
//     longName: "Hertle Christoph",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 131,
//       },
//     ],
//   },
//   {
//     id: 2776,
//     name: "hud",
//     foreName: "",
//     longName: "Hudritsch Urs",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 3591,
//     name: "HUG",
//     foreName: "",
//     longName: "Hugo Róisín Nora",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2781,
//     name: "hun",
//     foreName: "",
//     longName: "Hunziker Yannick",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 3596,
//     name: "IER",
//     foreName: "",
//     longName: "Ieronimo Tikhomirov Santina",
//     title: "IT",
//     active: true,
//     dids: [
//       {
//         id: 113,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3601,
//     name: "IPE",
//     foreName: "",
//     longName: "Ipekdjian Alexandre",
//     title: "ED",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3606,
//     name: "ISC",
//     foreName: "",
//     longName: "Isch Lara Helena",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2786,
//     name: "jac",
//     foreName: "",
//     longName: "Jacot Sarah",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 2791,
//     name: "jah",
//     foreName: "",
//     longName: "Jaha Albana",
//     title: "IN",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 156,
//       },
//     ],
//   },
//   {
//     id: 3611,
//     name: "JEI",
//     foreName: "",
//     longName: "Jeitziner Nicolas",
//     title: "INF",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2796,
//     name: "jen",
//     foreName: "",
//     longName: "Jenni Markus",
//     title: "IKA",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 129,
//       },
//     ],
//   },
//   {
//     id: 2799,
//     name: "jun",
//     foreName: "",
//     longName: "Jungkunz Edzard",
//     title: "GG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 128,
//       },
//     ],
//   },
//   {
//     id: 2804,
//     name: "kae",
//     foreName: "",
//     longName: "Käser Thomas",
//     title: "PP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 154,
//       },
//     ],
//   },
//   {
//     id: 2809,
//     name: "kam",
//     foreName: "",
//     longName: "Kammer Brigitte",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2814,
//     name: "kar",
//     foreName: "",
//     longName: "Käser-Ruff Marianne",
//     title: "L",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 137,
//       },
//     ],
//   },
//   {
//     id: 3616,
//     name: "KEM",
//     foreName: "",
//     longName: "Kellerhals Michèle",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2819,
//     name: "kgi",
//     foreName: "",
//     longName: "Kägi Michael",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2824,
//     name: "kir",
//     foreName: "",
//     longName: "Kirchhofer Sonja",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 2829,
//     name: "klp",
//     foreName: "",
//     longName: "Klopfstein Corinne",
//     title: "IKA",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 129,
//       },
//     ],
//   },
//   {
//     id: 3621,
//     name: "KNE",
//     foreName: "",
//     longName: "Kneuss-Anderson Abina",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3626,
//     name: "KNU",
//     foreName: "",
//     longName: "Knuchel Michèle",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 117,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2834,
//     name: "koe",
//     foreName: "",
//     longName: "Köppel Sarah",
//     title: "G",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 2839,
//     name: "kof",
//     foreName: "",
//     longName: "Koch Felizia",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 2844,
//     name: "kok",
//     foreName: "",
//     longName: "Koch Klemens",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 2849,
//     name: "kou",
//     foreName: "",
//     longName: "Kouoh Christian",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2854,
//     name: "kre",
//     foreName: "",
//     longName: "Kreuter Oliver",
//     title: "BG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 122,
//       },
//     ],
//   },
//   {
//     id: 2859,
//     name: "ksr",
//     foreName: "",
//     longName: "Käser Pascal",
//     title: "GG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//       {
//         id: 128,
//       },
//     ],
//   },
//   {
//     id: 2864,
//     name: "kum",
//     foreName: "",
//     longName: "Kummer Daniel",
//     title: "PP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 154,
//       },
//     ],
//   },
//   {
//     id: 3631,
//     name: "LAC",
//     foreName: "",
//     longName: "Lachat Michèle",
//     title: "HI",
//     active: true,
//     dids: [
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3636,
//     name: "LAN",
//     foreName: "",
//     longName: "Lanève Véronique",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2867,
//     name: "lar",
//     foreName: "",
//     longName: "Laurent Catherine",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 2872,
//     name: "laz",
//     foreName: "",
//     longName: "Lanz-Beutler Regina",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 2877,
//     name: "lee",
//     foreName: "",
//     longName: "Leemann Oliver",
//     title: "WR",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 134,
//       },
//     ],
//   },
//   {
//     id: 3641,
//     name: "LEI",
//     foreName: "",
//     longName: "Leitner Audrey",
//     title: "PY",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3646,
//     name: "LEP",
//     foreName: "",
//     longName: "Lepetit Maurice",
//     title: "MUS",
//     active: true,
//     dids: [
//       {
//         id: 116,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2882,
//     name: "lig",
//     foreName: "",
//     longName: "Liggenstorfer Rebecca",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 2887,
//     name: "lin",
//     foreName: "",
//     longName: "Linz Thomas",
//     title: "WR",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 134,
//       },
//     ],
//   },
//   {
//     id: 3651,
//     name: "LOP",
//     foreName: "",
//     longName: "Lopes Ana Rita",
//     title: "HI",
//     active: true,
//     dids: [
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3656,
//     name: "LOT",
//     foreName: "",
//     longName: "Lopinat François",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3661,
//     name: "LOU",
//     foreName: "",
//     longName: "Louvet Nicolas",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2892,
//     name: "lug",
//     foreName: "",
//     longName: "Luginbühl Simon",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3666,
//     name: "LUS",
//     foreName: "",
//     longName: "Lusa Jeanne",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2897,
//     name: "lyj",
//     foreName: "",
//     longName: "Ly John",
//     title: "G",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 2902,
//     name: "mae",
//     foreName: "",
//     longName: "Märki Doris",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 2907,
//     name: "mag",
//     foreName: "",
//     longName: "Mangold Sonya",
//     title: "WR",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 134,
//       },
//     ],
//   },
//   {
//     id: 2912,
//     name: "mai",
//     foreName: "",
//     longName: "Mattioli Ivan",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 3671,
//     name: "MAN",
//     foreName: "",
//     longName: "Magnin Luz-Maria",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3676,
//     name: "MAP",
//     foreName: "",
//     longName: "Marteau-Pellaton Emilie",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3681,
//     name: "MAR",
//     foreName: "",
//     longName: "Mayr Ana Katharina",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3686,
//     name: "MAT",
//     foreName: "",
//     longName: "Mantuano Tatiana",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3691,
//     name: "MAY",
//     foreName: "",
//     longName: "Mayoraz Thomas",
//     title: "GE",
//     active: true,
//     dids: [
//       {
//         id: 109,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2917,
//     name: "mee",
//     foreName: "",
//     longName: "Meyer Siegmar",
//     title: "G",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3696,
//     name: "MEM",
//     foreName: "",
//     longName: "Membrez Olivier",
//     title: "MUS",
//     active: true,
//     dids: [
//       {
//         id: 116,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2921,
//     name: "men",
//     foreName: "",
//     longName: "Menzi Sarala",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 3701,
//     name: "MER",
//     foreName: "",
//     longName: "Mercerat Loïc",
//     title: "PY",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2926,
//     name: "mes",
//     foreName: "",
//     longName: "Meier Iris",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 2931,
//     name: "mey",
//     foreName: "",
//     longName: "Meyer Ruth",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3706,
//     name: "MIO",
//     foreName: "",
//     longName: "Milio Enea",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2936,
//     name: "mla",
//     foreName: "",
//     longName: "Müller Alexander",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 2941,
//     name: "mld",
//     foreName: "",
//     longName: "Müller Daniel",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 2946,
//     name: "moe",
//     foreName: "",
//     longName: "Monney Yannik",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 2951,
//     name: "mol",
//     foreName: "",
//     longName: "Moll Philipp",
//     title: "G",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 3711,
//     name: "MON",
//     foreName: "",
//     longName: "Montavon Jacques",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2956,
//     name: "moo",
//     foreName: "",
//     longName: "Moor Pete",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3716,
//     name: "MOR",
//     foreName: "",
//     longName: "Morata Diane",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3721,
//     name: "MOS",
//     foreName: "",
//     longName: "Moser Antoinette",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2961,
//     name: "mph",
//     foreName: "",
//     longName: "Macpherson Mayra",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 3726,
//     name: "MSI",
//     foreName: "",
//     longName: "Mosimann Moritz",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2966,
//     name: "msr",
//     foreName: "",
//     longName: "Moser Laurent",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 2971,
//     name: "mtt",
//     foreName: "",
//     longName: "Mottaz Michelle",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 2976,
//     name: "mue",
//     foreName: "",
//     longName: "Müller Christine",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 2981,
//     name: "mul",
//     foreName: "",
//     longName: "Muhlert Sonja",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 3731,
//     name: "MUM",
//     foreName: "",
//     longName: "Müller Morgane",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3741,
//     name: "MUT",
//     foreName: "",
//     longName: "Murat Guillaume",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2986,
//     name: "neu",
//     foreName: "",
//     longName: "Neukom Susanne",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3746,
//     name: "NEV",
//     foreName: "",
//     longName: "Neveceral Jocelyne",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3751,
//     name: "NGO",
//     foreName: "",
//     longName: "Ngouangui Brice",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3756,
//     name: "PAC",
//     foreName: "",
//     longName: "Papon Cynthia",
//     title: "INF",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3761,
//     name: "PAN",
//     foreName: "",
//     longName: "Pantaleo Sabrina",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3766,
//     name: "PAT",
//     foreName: "",
//     longName: "Paratte Aurélie",
//     title: "PP",
//     active: true,
//     dids: [
//       {
//         id: 117,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3771,
//     name: "PEL",
//     foreName: "",
//     longName: "Pellaton Matthieu",
//     title: "PY",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 2991,
//     name: "pen",
//     foreName: "",
//     longName: "Pena Roberto",
//     title: "G",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 2996,
//     name: "pet",
//     foreName: "",
//     longName: "Peter Jürg",
//     title: "MU",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 138,
//       },
//     ],
//   },
//   {
//     id: 3001,
//     name: "pfu",
//     foreName: "",
//     longName: "Pfund Sam",
//     title: "MU",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 138,
//       },
//     ],
//   },
//   {
//     id: 3776,
//     name: "PLA",
//     foreName: "",
//     longName: "Placi Mauro",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3006,
//     name: "por",
//     foreName: "",
//     longName: "Porzig Christiane",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//       {
//         id: 138,
//       },
//     ],
//   },
//   {
//     id: 3781,
//     name: "PRA",
//     foreName: "",
//     longName: "Pravaz Olivier",
//     title: "PY",
//     active: true,
//     dids: [
//       {
//         id: 112,
//       },
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3786,
//     name: "PRE",
//     foreName: "",
//     longName: "Presi Patrick",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3791,
//     name: "PRI",
//     foreName: "",
//     longName: "Prati Valentina",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3011,
//     name: "ptr",
//     foreName: "",
//     longName: "Peter Dominique",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 131,
//       },
//     ],
//   },
//   {
//     id: 3016,
//     name: "raa",
//     foreName: "",
//     longName: "Raaflaub Martin",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 154,
//       },
//     ],
//   },
//   {
//     id: 3021,
//     name: "ram",
//     foreName: "",
//     longName: "Ramseier Nicole",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3796,
//     name: "RAU",
//     foreName: "",
//     longName: "Rauber Anne-Laure",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3026,
//     name: "rdr",
//     foreName: "",
//     longName: "Rodriguez Deisy",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 3801,
//     name: "REB",
//     foreName: "",
//     longName: "Rebstein Martine",
//     title: "CH",
//     active: true,
//     dids: [
//       {
//         id: 105,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3806,
//     name: "REG",
//     foreName: "",
//     longName: "Rebetez Gaël",
//     title: "HI",
//     active: true,
//     dids: [
//       {
//         id: 110,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3811,
//     name: "REM",
//     foreName: "",
//     longName: "Reymond Delphine",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3816,
//     name: "REN",
//     foreName: "",
//     longName: "Renzo Eliana",
//     title: "PY",
//     active: true,
//     dids: [
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3031,
//     name: "ria",
//     foreName: "",
//     longName: "Riard Sabine",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 3036,
//     name: "rie",
//     foreName: "",
//     longName: "Riedl Peter",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 3041,
//     name: "rik",
//     foreName: "",
//     longName: "Rickenbach Robin",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 131,
//       },
//     ],
//   },
//   {
//     id: 3046,
//     name: "rod",
//     foreName: "",
//     longName: "Rodriguez Floria",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3821,
//     name: "ROH",
//     foreName: "",
//     longName: "Rohrer Annick",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3051,
//     name: "roi",
//     foreName: "",
//     longName: "Rozic Dean",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 3826,
//     name: "ROL",
//     foreName: "",
//     longName: "Rossel Sophie",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3831,
//     name: "ROS",
//     foreName: "",
//     longName: "Rossel Thibaud",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 105,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3056,
//     name: "rot",
//     foreName: "",
//     longName: "Roth Beat",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3061,
//     name: "rox",
//     foreName: "",
//     longName: "Roux Aline",
//     title: "BG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 122,
//       },
//     ],
//   },
//   {
//     id: 3970,
//     name: "rsa",
//     foreName: "",
//     longName: "Rüesch Samira",
//     title: "F",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 126,
//       },
//     ],
//   },
//   {
//     id: 3066,
//     name: "rss",
//     foreName: "",
//     longName: "Rossier Lucas",
//     title: "B",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 121,
//       },
//     ],
//   },
//   {
//     id: 3836,
//     name: "RUA",
//     foreName: "",
//     longName: "Ruano Matthieu",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3071,
//     name: "rub",
//     foreName: "",
//     longName: "Ruben Tanja",
//     title: "L",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 137,
//       },
//     ],
//   },
//   {
//     id: 3841,
//     name: "RUD",
//     foreName: "",
//     longName: "Rüfli Dana",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3851,
//     name: "RUF",
//     foreName: "",
//     longName: "Rüfli Fabian",
//     title: "SPO",
//     active: true,
//     dids: [
//       {
//         id: 119,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3076,
//     name: "rup",
//     foreName: "",
//     longName: "Rupp Sabrina",
//     title: "GG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 128,
//       },
//     ],
//   },
//   {
//     id: 3081,
//     name: "rur",
//     foreName: "",
//     longName: "Rüegger Matthias",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3086,
//     name: "rus",
//     foreName: "",
//     longName: "Rüesch Jacqueline",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 3091,
//     name: "rut",
//     foreName: "",
//     longName: "Rüttimann Matthias",
//     title: "E",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//     ],
//   },
//   {
//     id: 3096,
//     name: "sal",
//     foreName: "",
//     longName: "Salm Annette",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 3856,
//     name: "SAU",
//     foreName: "",
//     longName: "Sauvet Anne-Lise",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3861,
//     name: "SAY",
//     foreName: "",
//     longName: "Sauty Maxime",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3866,
//     name: "SBD",
//     foreName: "",
//     longName: "Schiau-Botea Diana",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3101,
//     name: "sbr",
//     foreName: "",
//     longName: "Schneeberger Christian",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 131,
//       },
//     ],
//   },
//   {
//     id: 3871,
//     name: "SCA",
//     foreName: "",
//     longName: "Schaller Jéromine",
//     title: "AV",
//     active: true,
//     dids: [
//       {
//         id: 103,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3106,
//     name: "scf",
//     foreName: "",
//     longName: "Schaffner Lukas",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 131,
//       },
//       {
//         id: 156,
//       },
//     ],
//   },
//   {
//     id: 3111,
//     name: "sch",
//     foreName: "",
//     longName: "Schaefer Christoph",
//     title: "MU",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 138,
//       },
//     ],
//   },
//   {
//     id: 3876,
//     name: "SCI",
//     foreName: "",
//     longName: "Schiau Claire",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3116,
//     name: "sck",
//     foreName: "",
//     longName: "Schenk Mara",
//     title: "BG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 122,
//       },
//     ],
//   },
//   {
//     id: 3881,
//     name: "SCM",
//     foreName: "",
//     longName: "Schmid Jean-Etienne",
//     title: "MUS",
//     active: true,
//     dids: [
//       {
//         id: 116,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3121,
//     name: "scn",
//     foreName: "",
//     longName: "Schnell Mario",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//     ],
//   },
//   {
//     id: 3884,
//     name: "SCQ",
//     foreName: "",
//     longName: "Schmieman Quentin",
//     title: "ED",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3889,
//     name: "SCS",
//     foreName: "",
//     longName: "Scheidegger Salomé",
//     title: "ICA",
//     active: true,
//     dids: [
//       {
//         id: 111,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3126,
//     name: "sdg",
//     foreName: "",
//     longName: "Scheidegger Andres",
//     title: "IN",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 156,
//       },
//     ],
//   },
//   {
//     id: 3894,
//     name: "SES",
//     foreName: "",
//     longName: "Sester Christian",
//     title: "FR",
//     active: true,
//     dids: [
//       {
//         id: 108,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3899,
//     name: "SET",
//     foreName: "",
//     longName: "Sester Katharina",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3904,
//     name: "SFM",
//     foreName: "",
//     longName: "Schafer Matthias",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3131,
//     name: "sfr",
//     foreName: "",
//     longName: "Schafer Sebastian",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3136,
//     name: "shl",
//     foreName: "",
//     longName: "Schüttel Manuela",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 3141,
//     name: "shu",
//     foreName: "",
//     longName: "Schuppli Pascal",
//     title: "G",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//       {
//         id: 156,
//       },
//     ],
//   },
//   {
//     id: 3909,
//     name: "SIM",
//     foreName: "",
//     longName: "Simon Olivier",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 118,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3914,
//     name: "SIT",
//     foreName: "",
//     longName: "Simonet Johanne",
//     title: "MA",
//     active: true,
//     dids: [
//       {
//         id: 115,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3146,
//     name: "smo",
//     foreName: "",
//     longName: "Schmocker Laura",
//     title: "GG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//       {
//         id: 128,
//       },
//     ],
//   },
//   {
//     id: 3151,
//     name: "spe",
//     foreName: "",
//     longName: "Specogna Peter",
//     title: "G",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 125,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3156,
//     name: "srr",
//     foreName: "",
//     longName: "Scherrer Rafael",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3919,
//     name: "STE",
//     foreName: "",
//     longName: "Stegmüller Thierry",
//     title: "GE",
//     active: true,
//     dids: [
//       {
//         id: 109,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3161,
//     name: "stl",
//     foreName: "",
//     longName: "Strehl Michael",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//       {
//         id: 131,
//       },
//     ],
//   },
//   {
//     id: 3166,
//     name: "swa",
//     foreName: "",
//     longName: "Schwab Stephan",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 128,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 3924,
//     name: "TAR",
//     foreName: "",
//     longName: "Tarchini Antonella",
//     title: "GE",
//     active: true,
//     dids: [
//       {
//         id: 109,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3986,
//     name: "TEG",
//     foreName: "",
//     longName: "ten Broek Gaëlle",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3171,
//     name: "ten",
//     foreName: "",
//     longName: "Tenisch Christian",
//     title: "PP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 154,
//       },
//     ],
//   },
//   {
//     id: 3176,
//     name: "urw",
//     foreName: "",
//     longName: "Urwyler Jürg",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3929,
//     name: "VAI",
//     foreName: "",
//     longName: "Varrin Isabelle",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3934,
//     name: "VAP",
//     foreName: "",
//     longName: "Varrin Philippe",
//     title: "AN",
//     active: true,
//     dids: [
//       {
//         id: 102,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3181,
//     name: "ven",
//     foreName: "",
//     longName: "Venz Richard",
//     title: "C",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 123,
//       },
//     ],
//   },
//   {
//     id: 3186,
//     name: "vid",
//     foreName: "",
//     longName: "Vidic Dragana",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3939,
//     name: "VIS",
//     foreName: "",
//     longName: "Visinand Zoé",
//     title: "ED",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3944,
//     name: "VIU",
//     foreName: "",
//     longName: "Vieu Julien",
//     title: "BI",
//     active: true,
//     dids: [
//       {
//         id: 104,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3949,
//     name: "VOD",
//     foreName: "",
//     longName: "von Dach Rachel",
//     title: "AV",
//     active: true,
//     dids: [
//       {
//         id: 103,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3954,
//     name: "VOG",
//     foreName: "",
//     longName: "Vogt Yvonne",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3191,
//     name: "von",
//     foreName: "",
//     longName: "von Heugel Simon",
//     title: "WR",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 134,
//       },
//     ],
//   },
//   {
//     id: 3196,
//     name: "vtb",
//     foreName: "",
//     longName: "Von Tobel Thomas",
//     title: "SP",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 153,
//       },
//     ],
//   },
//   {
//     id: 3959,
//     name: "WAH",
//     foreName: "",
//     longName: "Wahli, Simone",
//     title: "AL",
//     active: true,
//     dids: [
//       {
//         id: 101,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3964,
//     name: "WEN",
//     foreName: "",
//     longName: "Wenger Alexandre",
//     title: "ED",
//     active: true,
//     dids: [
//       {
//         id: 106,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3199,
//     name: "wor",
//     foreName: "",
//     longName: "Woern Mirio",
//     title: "GG",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 127,
//       },
//       {
//         id: 128,
//       },
//     ],
//   },
//   {
//     id: 3204,
//     name: "wue",
//     foreName: "",
//     longName: "Wüthrich Claudia",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
//   {
//     id: 3209,
//     name: "wys",
//     foreName: "",
//     longName: "Wyss Christian",
//     title: "P",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//       {
//         id: 131,
//       },
//     ],
//   },
//   {
//     id: 3969,
//     name: "ZAP",
//     foreName: "",
//     longName: "Zappella David",
//     title: "GE",
//     active: true,
//     dids: [
//       {
//         id: 109,
//       },
//       {
//         id: 165,
//       },
//     ],
//   },
//   {
//     id: 3214,
//     name: "zum",
//     foreName: "",
//     longName: "Zumbrunnen Olivia",
//     title: "M",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 130,
//       },
//     ],
//   },
//   {
//     id: 3219,
//     name: "zwy",
//     foreName: "",
//     longName: "Zwygart Thomas",
//     title: "D",
//     active: true,
//     dids: [
//       {
//         id: 66,
//       },
//       {
//         id: 124,
//       },
//       {
//         id: 127,
//       },
//     ],
//   },
// ];

const DATE = "2022-09-13T00:00:00Z";

const t0 = Date.now();
untis
  .login()
  .then(() => {
    console.log("s1");
    return untis.getLatestSchoolyear().then((year) => ({ schoolyear: year }));
  })
  .then((data) => {
    console.log("s2");
    return untis.getSubjects().then((subjects) => {
      const subjs = subjects.map((s) => {
        return {
          id: s.id,
          name: s.name,
          alternate_name: s.alternateName,
          long_name: s.longName,
          active: s.active,
        };
      });
      return { subjects: subjs, ...data };
    });
  })
  .then((data) => {
    return untis.getTeachers().then((d) => {
      return { ...data, teachers: d };
    });
  })
  .then((data) => {
    console.log("s3");
    return untis.getDepartments().then((d) => ({ ...data, departments: d }));
  })
  .then((data) => {
    console.log("s4");
    return untis
      .getClasses(true, data.schoolyear.id)
      .then((c) => ({ ...data, classes: c }));
  })
  .then((data) => {
    const monday = moment(DATE).utc().startOf("isoWeek");
    console.log("s5");
    const proms = data.classes.map((klass) => {
      return untis
        .getTimetableForWeek(new Date(DATE), klass.id, unti.TYPES.CLASS, 2)
        .then((tt) => {
          const lessonIds = new Set<number>();
          const lessons: {
            id: number;
            lesson_id: number;
            lesson_number: number;
            start_time: number;
            end_time: number;
            class_ids: number[];
            teacher_ids: number[];
            subject_id: number;
          }[] = [];
          tt.filter(
            (e) => e.lessonCode === "LESSON" && e.subjects.length === 1
          ).forEach((e) => {
            const subj = e.subjects[0].element;
            const stime = `${e.startTime}`.padStart(4, "0");
            const etime = `${e.endTime}`.padStart(4, "0");
            const sdate = moment.utc(`${e.date} ${stime}`, "YYYYMMDD HHmm");
            const edate = moment.utc(`${e.date} ${etime}`, "YYYYMMDD HHmm");

            const start_time = sdate.diff(monday, "milliseconds");
            const end_time = edate.diff(monday, "milliseconds");
            if (!lessonIds.has(e.id)) {
              lessonIds.add(e.id);
              lessons.push({
                id: e.id,
                lesson_id: e.lessonId,
                lesson_number: e.lessonNumber,
                start_time: start_time,
                end_time: end_time,
                class_ids: e.classes.map((c) => c.id),
                teacher_ids: e.teachers.map((t) => t.element.id),
                subject_id: subj.id,
              });
            }
          });
          return lessons;
        });
    });
    return Promise.all(proms).then((l) => {
      console.log("s6");
      const lids = new Set<number>();
      const lessons: {
        id: number;
        lesson_id: number;
        lesson_number: number;
        start_time: number;
        end_time: number;
        class_ids: number[];
        teacher_ids: number[];
        subject_id: number;
      }[] = [];
      l.forEach((tt) => {
        tt.forEach((lesson) => {
          if (!lids.has(lesson.id)) {
            lids.add(lesson.id);
            lessons.push(lesson);
          }
        });
      });
      return {
        ...data,
        lessons: lessons,
      };
    });
  })
  .then((data) => {
    console.log("s7");
    const t = Date.now() - t0;
    fs.writeFileSync("data.json", JSON.stringify(data, undefined, 2), {
      encoding: "utf-8",
    });
    // console.log(JSON.stringify(timetable, undefined, 2))
    // console.log(timetable, unti.convertUntisTime(timetable));
    console.log("tt", t);
    // profit
  });
