"""Set up sys.path and mock Modal before any test imports modal_app."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock

# Make services/trainer/ importable so `import modal_app` and `from trace import ...` work.
_trainer_dir = Path(__file__).resolve().parents[1]
if str(_trainer_dir) not in sys.path:
    sys.path.insert(0, str(_trainer_dir))


def _noop_function_decorator(*args, **kwargs):
    """Return a transparent decorator so @app.function(...) is a no-op in tests."""

    def decorator(fn):
        return fn

    return decorator


_mock_app = MagicMock()
_mock_app.function.side_effect = _noop_function_decorator

_mock_image = MagicMock()
_mock_image.pip_install.return_value = _mock_image
_mock_image.add_local_python_source.return_value = _mock_image

_mock_modal = MagicMock()
_mock_modal.App.return_value = _mock_app
_mock_modal.Image.debian_slim.return_value = _mock_image
_mock_modal.Volume.from_name.return_value = MagicMock()

sys.modules["modal"] = _mock_modal
