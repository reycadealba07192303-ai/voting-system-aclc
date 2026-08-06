/** Solo/unopposed positions require >= 51% of total voters to win */
const SOLO_MAJORITY_THRESHOLD = 0.51

function countVotesForCandidate(positionVotes, candidateId) {
  const cid = candidateId.toString()
  return positionVotes.filter(
    (v) => !v.is_abstain && v.candidate_id && v.candidate_id.toString() === cid
  ).length
}

/**
 * @param {object} position
 * @param {object[]} candidates — all election candidates
 * @param {object[]} votes — all election votes
 * @param {number} totalVoters — distinct students who submitted a ballot
 */
function computePositionResults(position, candidates, votes, totalVoters) {
  const posId = position._id.toString()
  const positionVotes = votes.filter((v) => v.position_id.toString() === posId)
  const abstentions = positionVotes.filter((v) => v.is_abstain).length

  const posCandidates = candidates.filter(
    (c) => c.position_id.toString() === posId
  )

  const candidateResults = posCandidates
    .map((c) => ({
      _id: c._id,
      name: c.name,
      photo_url: c.photo_url,
      partylist: c.partylist,
      votes: countVotesForCandidate(positionVotes, c._id),
    }))
    .sort((a, b) => b.votes - a.votes)

  const soloUnopposed =
    posCandidates.length === 1 && (position.max_winners || 1) === 1

  let winners = []
  let solo_majority_met = null

  if (soloUnopposed) {
    const solo = candidateResults[0]
    if (solo && totalVoters > 0) {
      const pct = solo.votes / totalVoters
      solo_majority_met = pct >= SOLO_MAJORITY_THRESHOLD
      if (solo_majority_met && solo.votes > 0) {
        winners = [{ ...solo, vote_percentage: Math.round(pct * 100) }]
      }
    } else {
      solo_majority_met = false
    }
  } else {
    winners = candidateResults
      .slice(0, position.max_winners || 1)
      .filter((c) => c.votes > 0)
  }

  return {
    _id: position._id,
    title: position.title,
    max_winners: position.max_winners,
    candidates: candidateResults,
    winners,
    abstentions,
    total_voters: totalVoters,
    solo_unopposed: soloUnopposed,
    solo_majority_required_pct: soloUnopposed ? Math.round(SOLO_MAJORITY_THRESHOLD * 100) : null,
    solo_majority_met,
  }
}

function buildElectionResults(positions, candidates, votes, totalVoters) {
  return positions.map((pos) =>
    computePositionResults(pos, candidates, votes, totalVoters)
  )
}

module.exports = {
  SOLO_MAJORITY_THRESHOLD,
  computePositionResults,
  buildElectionResults,
}
