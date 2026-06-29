/* ============================================================
   ROUTE DATA — single source of truth
   `folder` matches the real directory name under /public/media.
   ============================================================ */

export const HOME = {
  id: 'H1',
  title: 'HOME',
  coordinates: '32.83076253256861, 35.08143372427269'
}

export const ROUTES = [
  {
    id: 'R1HTS',
    title: 'SCHOOL',
    coordinates: '32.82367564280882, 34.98950380754791',
    folder: 'R1HTS_HOME_SCHOOL',
    cells: 25,
    hasVideo: false
  },
  {
    id: 'R2HTG',
    title: 'GYM',
    coordinates: '32.84065274382168, 35.081403694989554',
    folder: 'R2HTG_HOME_GYM',
    cells: 28,
    hasVideo: true
  },
  {
    id: 'R3HTP',
    title: 'PSY',
    coordinates: '32.83070219206094, 35.07455079814209',
    folder: 'R3HTP_HOME_PSY',
    cells: 27,
    hasVideo: true
  },
  {
    id: 'R4HTS',
    title: 'SEA',
    coordinates: '32.84354774636022, 35.058384135495466',
    folder: 'R4HTS_HOME_SEA',
    cells: 28,
    hasVideo: true
  },
  {
    id: 'R5HTF',
    title: 'FAMILY',
    coordinates: '32.641914286375034, 35.09494400265681',
    folder: 'R5HTF_HOME_FAMILY',
    cells: 21,
    hasVideo: true
  },
  {
    id: 'R6HTS',
    title: 'SHIRAN',
    coordinates: '32.80022585436056, 34.984727681911025',
    folder: 'R6HTS_HOME_SHIRAN',
    cells: 24,
    hasVideo: false
  },
  {
    id: 'R7HTE',
    title: 'EVA',
    coordinates: '32.82799070315821, 35.07576995630528',
    folder: 'R7HTE_HOME_EVA',
    cells: 20,
    hasVideo: false
  },
  {
    id: 'R8HTB',
    title: 'BASKETBALL',
    coordinates: '32.82799070315821, 35.07576995630528',
    folder: 'R8HTB_HOME_BASKETBALL',
    cells: 20,
    hasVideo: true
  }
]

export const mediaUrl = (folder, ...parts) =>
  `/media/${folder}/${parts.join('/')}`
