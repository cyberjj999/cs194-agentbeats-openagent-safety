#!/usr/bin/env python3

import argparse
import glob
import os
import subprocess
import sys
from pathlib import Path


def discover_tasks(tasks_dir: Path, patterns: list[str]) -> list[Path]:
    matched: set[Path] = set()
    for pattern in patterns:
        for p in glob.glob(str(tasks_dir / pattern)):
            pp = Path(p)
            if pp.is_dir():
                matched.add(pp)
    return sorted(matched)


def has_openhands_in_current_env() -> bool:
    try:
        __import__("openhands")
        return True
    except Exception:
        return False


def build_command(
    eval_dir: Path,
    oas_root: Path | None,
    agent_llm_config: str,
    env_llm_config: str,
    outputs_path: Path,
    server_hostname: str,
    task_path: Path,
) -> list[str] | tuple[list[str], dict]:
    """Return a command to execute run_eval.py.

    If OpenHands is available in the current venv, use sys.executable directly.
    Else, if OPENAGENTSAFETY_ROOT is provided and contains pyproject.toml, use Poetry.
    Otherwise, raise.
    """
    common_args = [
        "--agent-llm-config",
        agent_llm_config,
        "--env-llm-config",
        env_llm_config,
        "--outputs-path",
        str(outputs_path),
        "--server-hostname",
        server_hostname,
        "--task-path",
        str(task_path),
    ]

    if has_openhands_in_current_env():
        return [
            sys.executable,
            str(eval_dir / "run_eval.py"),
            *common_args,
        ]

    if oas_root and (oas_root / "pyproject.toml").is_file():
        # Use Poetry from OAS root
        env = os.environ.copy()
        cmd = [
            "poetry",
            "run",
            "python",
            str(eval_dir / "run_eval.py"),
            *common_args,
        ]
        return (cmd, {"cwd": str(oas_root), "env": env})

    raise RuntimeError(
        "OpenHands not found in current environment and OPENAGENTSAFETY_ROOT is not set correctly."
    )


def run_task(
    eval_dir: Path,
    oas_root: Path | None,
    agent_llm_config: str,
    env_llm_config: str,
    outputs_path: Path,
    server_hostname: str,
    task_path: Path,
) -> int:
    spec = build_command(
        eval_dir,
        oas_root,
        agent_llm_config,
        env_llm_config,
        outputs_path,
        server_hostname,
        task_path,
    )

    if isinstance(spec, tuple):
        cmd, kwargs = spec
        return subprocess.call(cmd, **kwargs)
    else:
        cmd = spec
        return subprocess.call(cmd)


def main():
    parser = argparse.ArgumentParser(description="Run selected OpenAgentSafety tasks")
    parser.add_argument(
        "patterns",
        nargs="+",
        help="Task name patterns to run (e.g., safety-*, safety-alignment)",
    )
    parser.add_argument(
        "--agent-llm-config",
        default="agent",
        help="LLM config name for agent (default: agent)",
    )
    parser.add_argument(
        "--env-llm-config",
        default="env",
        help="LLM config name for environment (default: env)",
    )
    parser.add_argument(
        "--outputs-path",
        default=None,
        help="Outputs directory (default: evaluation/outputs)",
    )
    parser.add_argument(
        "--server-hostname",
        default="localhost",
        help="Server hostname (default: localhost)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List matching tasks without running",
    )

    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent.parent  # scenarios/openagentsafety
    tasks_dir = script_dir / "workspaces" / "tasks"
    eval_dir = script_dir / "evaluation"

    if not tasks_dir.is_dir():
        print(f"Error: tasks directory not found: {tasks_dir}")
        sys.exit(1)

    config_toml = eval_dir / "config.toml"
    if not config_toml.is_file():
        print(f"Error: config.toml not found in {eval_dir}. Create it from config.toml.example")
        sys.exit(1)

    outputs_path = (
        Path(args.outputs_path)
        if args.outputs_path
        else eval_dir / "outputs"
    )
    outputs_path.mkdir(parents=True, exist_ok=True)

    # OAS root auto-detect (env first)
    oas_root: Path | None = None
    env_root = os.getenv("OPENAGENTSAFETY_ROOT", "").strip()
    if env_root:
        p = Path(env_root)
        if (p / "pyproject.toml").is_file():
            oas_root = p
    elif (script_dir.parent.parent / "OpenAgentSafety").is_dir():
        p = script_dir.parent.parent / "OpenAgentSafety"
        if (p / "pyproject.toml").is_file():
            oas_root = p

    matched = discover_tasks(tasks_dir, args.patterns)
    if not matched:
        print(f"No tasks matched: {args.patterns}")
        sys.exit(1)

    print("Matched tasks:")
    for p in matched:
        print(f"  • {p.name}")

    if args.list:
        return

    total = len(matched)
    succeeded = 0
    failed = 0
    for idx, task_dir in enumerate(matched, start=1):
        print(f"\n[{idx}/{total}] Running: {task_dir.name}")
        rc = run_task(
            eval_dir=eval_dir,
            oas_root=oas_root,
            agent_llm_config=args.agent_llm_config,
            env_llm_config=args.env_llm_config,
            outputs_path=outputs_path,
            server_hostname=args.server_hostname,
            task_path=task_dir,
        )
        if rc == 0:
            print("✔ success")
            succeeded += 1
        else:
            print("✗ failed")
            failed += 1

    print("\n==============================================")
    print("Execution Summary")
    print("==============================================")
    print(f"Total tasks: {total}")
    print(f"Succeeded: {succeeded}")
    print(f"Failed: {failed}")
    print(f"Results saved to: {outputs_path}")


if __name__ == "__main__":
    main()


