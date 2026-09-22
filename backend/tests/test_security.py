from app.core import security


def test_hash_password_does_not_return_plaintext() -> None:
    hashed = security.hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"


def test_verify_password_accepts_correct_password() -> None:
    hashed = security.hash_password("correct horse battery staple")
    assert security.verify_password("correct horse battery staple", hashed) is True


def test_verify_password_rejects_wrong_password() -> None:
    hashed = security.hash_password("correct horse battery staple")
    assert security.verify_password("wrong password", hashed) is False


def test_create_access_token_round_trips_subject() -> None:
    token = security.create_access_token(subject="1")
    assert security.decode_access_token(token) == "1"


def test_decode_access_token_rejects_garbage_token() -> None:
    assert security.decode_access_token("not-a-real-token") is None


def test_decode_access_token_rejects_tampered_token() -> None:
    token = security.create_access_token(subject="1")
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
    assert security.decode_access_token(tampered) is None
