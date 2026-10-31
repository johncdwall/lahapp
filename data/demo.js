// A small made-up game so the app works with no network. Not a real NHL game.
const R = (id, n, pos, team) => ({ playerId: id, sweaterNumber: n, positionCode: pos, teamId: team });
const home = [[1, 8, 'C'], [2, 13, 'L'], [3, 22, 'R'], [4, 4, 'D'], [5, 5, 'D'], [6, 62, 'C'], [7, 17, 'L'], [8, 24, 'R'], [9, 3, 'D'], [10, 12, 'C']];
const away = [[11, 10, 'C'], [12, 19, 'L'], [13, 26, 'R'], [14, 6, 'D'], [15, 2, 'D'], [16, 48, 'C'], [17, 15, 'L'], [18, 20, 'R'], [19, 28, 'D'], [20, 29, 'C']];
const g = (id, per, t, sc, a1, a2, sit, owner) => ({ eventId: id, periodDescriptor: { number: per, periodType: per > 3 ? 'OT' : 'REG' }, timeInPeriod: t, situationCode: sit, typeDescKey: 'goal', details: { scoringPlayerId: sc, assist1PlayerId: a1, assist2PlayerId: a2, eventOwnerTeamId: owner } });
const p = (id, per, t, who, desc, code, sit) => ({ eventId: id, periodDescriptor: { number: per, periodType: 'REG' }, timeInPeriod: t, situationCode: sit, typeDescKey: 'penalty', details: { committedByPlayerId: who, descKey: desc, typeCode: code, duration: 2 } });
const ic = (id, per, t) => ({ eventId: id, periodDescriptor: { number: per, periodType: 'REG' }, timeInPeriod: t, situationCode: '1551', typeDescKey: 'icing', details: {} });
export const DEMO = {
  id: 'demo', homeTeam: { id: 1, abbrev: 'HOM' }, awayTeam: { id: 2, abbrev: 'AWY' },
  rosterSpots: [...home.map(([i, n, pos]) => R(i, n, pos, 1)), ...away.map(([i, n, pos]) => R(i, n, pos, 2))],
  plays: [
    ic(1, 1, '03:10'), p(2, 1, '05:42', 16, 'slashing', 'MIN', '1551'), g(3, 1, '06:30', 12, 11, null, '1451', 2),
    g(4, 1, '12:05', 2, 1, 3, '1551', 1), p(5, 1, '15:20', 5, 'tripping', 'MIN', '1551'), ic(6, 1, '18:44'),
    g(7, 2, '00:42', 6, 4, null, '1551', 1), p(8, 2, '04:11', 14, 'hooking', 'MIN', '1551'), g(9, 2, '05:00', 1, 6, 2, '1541', 1),
    p(10, 2, '10:30', 17, 'roughing', 'MIN', '1551'), g(11, 2, '13:48', 13, 15, null, '1551', 2), ic(12, 2, '17:02'),
    g(13, 3, '03:15', 3, null, null, '1551', 1), p(14, 3, '07:20', 9, 'holding', 'MIN', '1551'), p(15, 3, '08:55', 19, 'cross-checking', 'MIN', '1451'),
    g(16, 3, '19:20', 16, 20, 19, '1551', 2), ic(17, 3, '19:50'),
  ],
  _landing: { summary: { threeStars: [{ star: 1, sweaterNo: 13 }, { star: 2, sweaterNo: 2 }, { star: 3, sweaterNo: 48 }] } },
};
