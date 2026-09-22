import time
from collections import defaultdict
from functools import lru_cache


class LoginRateLimiter:
    def __init__(self, max_attempts: int, window_seconds: float) -> None:
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds
        self._failures: dict[str, list[float]] = defaultdict(list)

    def _recent_failures(self, key: str) -> list[float]:
        cutoff = time.monotonic() - self._window_seconds
        recent = [t for t in self._failures[key] if t >= cutoff]
        self._failures[key] = recent
        return recent

    def is_blocked(self, key: str) -> bool:
        return len(self._recent_failures(key)) >= self._max_attempts

    def record_failure(self, key: str) -> None:
        self._recent_failures(key)
        self._failures[key].append(time.monotonic())

    def record_success(self, key: str) -> None:
        self._failures.pop(key, None)


@lru_cache
def get_login_rate_limiter() -> LoginRateLimiter:
    return LoginRateLimiter(max_attempts=5, window_seconds=60)
