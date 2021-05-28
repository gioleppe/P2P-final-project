// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

contract Mayor {
    // Structs, events, and modifiers

    // Store refund data
    struct Refund {
        uint256 soul;
        address symbol;
    }

    struct Candidate {
        uint256 deposited_soul;
        uint256 vote_soul;
        uint256 votes;
    }

    // Data to manage the confirmation
    struct Conditions {
        uint32 quorum;
        uint32 envelopes_casted;
        uint32 envelopes_opened;
        bool outcome_declared;
        uint256 candidates_deposits_left;
    }

    event NewMayor(address _candidate);
    event Tie();
    event RefundedVoter(address _voter);
    event EnvelopeCast(address _voter);
    event EnvelopeOpen(address _voter, uint256 _soul, address _symbol);
    event VoteForMe(address _candidate, uint256 _soul);

    // Someone can vote as long as the quorum is not reached and the candidates finished depositing their soul
    modifier canVote() {
        require(
            voting_condition.candidates_deposits_left == 0,
            "You cannot vote until all candidates have finalised their participation!"
        );
        require(
            voting_condition.envelopes_casted < voting_condition.quorum,
            "Cannot vote now, voting quorum has been reached"
        );
        _;
    }

    // Envelopes can be opened only after receiving the quorum
    modifier canOpen() {
        require(
            voting_condition.envelopes_casted == voting_condition.quorum,
            "Cannot open an envelope, voting quorum not reached yet"
        );
        _;
    }

    // The outcome of the confirmation can be computed as soon as all the casted envelopes have been opened
    modifier canCheckOutcome() {
        require(
            voting_condition.envelopes_opened ==
                voting_condition.envelopes_casted,
            "Cannot check the winner, need to open all the sent envelopes"
        );
        require(
            voting_condition.outcome_declared == false,
            "The winner has already been declared!"
        );
        _;
    }

    // State attributes

    // Initialization variables
    address[] public candidates;
    address payable public escrow;

    // Candidates mapping for soul depositing and counting votes
    mapping(address => bool) is_candidate;
    mapping(address => Candidate) candidate_standings;

    // Voting phase variables
    mapping(address => bytes32) envelopes;

    Conditions voting_condition;

    // Refund phase variables
    mapping(address => Refund) souls;
    address[] voters;

    /// @notice The constructor only initializes internal variables
    /// @param _candidates (address array) The addresses/symbols of the mayor candidates
    /// @param _escrow (address) The address of the escrow account
    /// @param _quorum (address) The number of voters required to finalize the confirmation
    constructor(
        address[] memory _candidates,
        address payable _escrow,
        uint32 _quorum
    ) public {
        require((_candidates.length > 1), "You need two candidates at least!");

        // add to mapping to check if they're really candidates
        for (uint256 i = 0; i < _candidates.length; i++) {
            candidates.push(_candidates[i]);
            is_candidate[candidates[i]] = true;
        }

        escrow = _escrow;
        voting_condition = Conditions({
            quorum: _quorum,
            envelopes_casted: 0,
            envelopes_opened: 0,
            outcome_declared: false,
            candidates_deposits_left: _candidates.length
        });
    }

    /// @notice Let candidates store their soul for cookies ;)
    /// soul can only deposited once, the sender must be a candidate, of course.
    function deposit_soul() public payable {
        require(
            is_candidate[msg.sender],
            "You're not a candidate in this election!"
        );
        require(
            candidate_standings[msg.sender].deposited_soul == 0,
            "You've already deposited some soul!"
        );

        // add the candidate to the standings
        candidate_standings[msg.sender] = Candidate({
            deposited_soul: msg.value,
            vote_soul: 0,
            votes: 0
        });

        // decrease the needed deposits
        voting_condition.candidates_deposits_left--;
        // just to annouce we've got free cookies :)
        emit VoteForMe(msg.sender, msg.value);
    }

    /// @notice Store a received voting envelope
    /// @param _envelope The envelope represented as the keccak256 hash of (sigil, doblon, soul)
    function cast_envelope(bytes32 _envelope) public canVote {
        if (envelopes[msg.sender] == 0x0)
            // => NEW, update on 17/05/2021
            voting_condition.envelopes_casted++;

        envelopes[msg.sender] = _envelope;
        emit EnvelopeCast(msg.sender);
    }

    /// @notice Open an envelope and store the vote information
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _symbol (bool) The voting preference
    /// @dev The soul is sent as crypto
    /// @dev Need to recompute the hash to validate the envelope previously casted
    function open_envelope(uint256 _sigil, address _symbol)
        public
        payable
        canOpen
    {
        require(
            envelopes[msg.sender] != 0x0,
            "The sender has not casted any votes"
        );

        bytes32 _casted_envelope = envelopes[msg.sender];
        bytes32 _sent_envelope =
            keccak256(abi.encode(_sigil, _symbol, msg.value));

        require(
            _casted_envelope == _sent_envelope,
            "Sent envelope does not correspond to the one casted"
        );
        require(
            souls[msg.sender].soul == 0,
            "You've already opened your envelope!"
        );

        // let's prepare for a possible refund
        souls[msg.sender] = Refund(msg.value, _symbol);
        voters.push(msg.sender);

        // add a vote and some soul to the candidate's standing
        candidate_standings[_symbol].votes++;
        candidate_standings[_symbol].vote_soul += msg.value;

        // we increase the opened envelopes number
        voting_condition.envelopes_opened++;

        emit EnvelopeOpen(msg.sender, msg.value, _symbol);
    }

    /// @notice checks if there's a winner and returns its address
    function check_winner() private returns (address, bool) {
        uint256 tiers = 0;
        uint256 max_soul = 0;
        uint256 max_votes = 0;
        address possible_winner;

        for (uint256 i = 0; i < candidates.length; i++) {
            // let's fetch candidate's standings
            address candidate = candidates[i];
            uint256 candidate_soul = candidate_standings[candidate].vote_soul;
            uint256 candidate_votes = candidate_standings[candidate].votes;

            if (candidate_soul > max_soul) {
                possible_winner = address(candidate);
                max_soul = candidate_soul;
                max_votes = candidate_votes;
                tiers = 0;
            }
            // otherwise there could be a tie at (max_soul, max_votes)
            else if (candidate_soul == max_soul) {
                tiers += 1;
            }
        }

        if (tiers == 0) {
            return (possible_winner, false);
        } else {
            check_tie(max_votes);
            return (address(0), true);
        }
    }

    function check_tie(uint256 max_votes) private {
        emit Tie();
    }

    /// @notice Either confirm or kick out the candidate. Refund the electors who voted for the losing outcome
    function mayor_or_sayonara() public canCheckOutcome {
        // // in order not to exploit this multiple times
        // voting_condition.outcome_declared = true;

        // // return a pair with winner if there's one, and a tie check bool
        (address winner, bool tie) = check_winner();

        // if there's no tie, emit winner
        if (!tie) emit NewMayor(winner);

        // // // refund losing voters
        // // for (uint256 i = 0; i < voters.length; i++) {
        // //     // if the voter "won", no refund
        // //     // right line -> if (souls[voters[i]].doblon == confirmed) continue;
        // //     if (true) continue;
        // //     else {
        // //         address payable to_refund = payable(voters[i]);
        // //         to_refund.transfer(souls[to_refund].soul);
        // //         emit RefundedVoter(to_refund);
        // //     }
        // // }
    }

    /// @notice Compute a voting envelope
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _symbol (addres) The symbol of a candidate, represented by his address
    /// @param _soul (uint) The soul associated to the vote
    function compute_envelope(
        uint256 _sigil,
        address _symbol,
        uint256 _soul
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_sigil, _symbol, _soul));
    }
}
