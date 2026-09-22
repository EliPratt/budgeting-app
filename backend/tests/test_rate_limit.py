import time

from app.core.rate_limit import LoginRateLimiter


def test_allows_attempts_under_the_limit() -> None:
    limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)
    for _ in range(4):
        assert limiter.is_blocked("1.2.3.4") is False
        limiter.record_failure("1.2.3.4")


def test_blocks_after_max_attempts_within_window() -> None:
    limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)
    for _ in range(5):
        limiter.record_failure("1.2.3.4")
    assert limiter.is_blocked("1.2.3.4") is True


def test_tracks_each_key_independently() -> None:
    limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)
    for _ in range(5):
        limiter.record_failure("1.2.3.4")
    assert limiter.is_blocked("5.6.7.8") is False


def test_success_clears_prior_failures() -> None:
    limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)
    for _ in range(4):
        limiter.record_failure("1.2.3.4")
    limiter.record_success("1.2.3.4")
    assert limiter.is_blocked("1.2.3.4") is False


def test_old_failures_outside_window_do_not_count() -> None:
    limiter = LoginRateLimiter(max_attempts=5, window_seconds=0.05)
    for _ in range(5):
        limiter.record_failure("1.2.3.4")
    time.sleep(0.1)
    assert limiter.is_blocked("1.2.3.4") is False
