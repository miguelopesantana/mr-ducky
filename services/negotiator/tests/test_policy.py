from app.policy import MAX_COUNTERS, NegotiationPolicy


def make_policy() -> NegotiationPolicy:
    return NegotiationPolicy(walk_away_threshold_eur=9.5, target_price_eur=8.0)


def test_counter_under_limit_returns_round():
    p = make_policy()
    out = p.evaluate_counter(price_eur=8.0, justification="amigo paga 8")
    assert out["counter_round"] == 1
    assert out["max_counters"] == MAX_COUNTERS
    assert "guidance" in out


def test_counter_increments():
    p = make_policy()
    p.evaluate_counter(price_eur=10.0, justification="x")
    p.evaluate_counter(price_eur=9.0, justification="x")
    out = p.evaluate_counter(price_eur=8.5, justification="x")
    assert out["counter_round"] == 3
    assert p.last_counter == 8.5


def test_counter_over_limit_warns():
    p = make_policy()
    for _ in range(MAX_COUNTERS):
        p.evaluate_counter(price_eur=8.0, justification="x")
    out = p.evaluate_counter(price_eur=8.0, justification="x")
    assert "Já fizeste" in out["guidance"]


def test_accept_above_walkaway_rejected():
    p = make_policy()
    out = p.evaluate_accept(price_eur=10.0, terms_summary="12 meses")
    assert out["accepted"] is False
    assert p.accepted_offer is None
    assert p.final_outcome is None
    assert p.best_offer_seen == 10.0


def test_accept_at_walkaway_accepted():
    p = make_policy()
    out = p.evaluate_accept(price_eur=9.5, terms_summary="12 meses")
    assert out["accepted"] is True


def test_accept_within_walkaway_records_agreement():
    p = make_policy()
    out = p.evaluate_accept(price_eur=9.0, terms_summary="12 meses")
    assert out["accepted"] is True
    assert p.accepted_offer == {"price_eur": 9.0, "terms_summary": "12 meses"}
    assert p.final_outcome == "agreement"


def test_best_offer_tracking():
    p = make_policy()
    p.evaluate_accept(price_eur=11.0, terms_summary="x")
    p.evaluate_accept(price_eur=10.5, terms_summary="x")
    p.evaluate_accept(price_eur=10.8, terms_summary="x")
    assert p.best_offer_seen == 10.5


def test_register_operator_offer_above_walkaway_still_tracks():
    p = make_policy()
    out = p.register_operator_offer(price_eur=14.0)
    assert out["registered"] is True
    assert out["above_walk_away"] is True
    assert p.best_offer_seen == 14.0
    assert p.accepted_offer is None


def test_register_operator_offer_keeps_minimum():
    p = make_policy()
    p.register_operator_offer(price_eur=14.0)
    p.register_operator_offer(price_eur=11.0)
    p.register_operator_offer(price_eur=12.5)
    assert p.best_offer_seen == 11.0


def test_escalation_records():
    p = make_policy()
    p.escalate(reason="pediram código SMS")
    assert len(p.escalations) == 1
    assert p.escalations[0]["reason"] == "pediram código SMS"


def test_finalize_sets_outcome():
    p = make_policy()
    out = p.finalize("no_agreement", final_price_eur=None, notes="resistente")
    assert out["outcome"] == "no_agreement"
    assert p.final_outcome == "no_agreement"
