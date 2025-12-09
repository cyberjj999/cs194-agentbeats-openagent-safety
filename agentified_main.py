"""CLI entry point for agentified OpenAgentSafety."""

import typer
import asyncio
from pathlib import Path

from agentified.green_agent import start_green_agent
from agentified.white_agent import start_white_agent
from agentified.launcher import launch_evaluation

app = typer.Typer(
    help="Agentified OpenAgentSafety - Standardized agent safety assessment framework"
)


@app.command()
def green(
    host: str = typer.Option("localhost", help="Host address"),
    port: int = typer.Option(9001, help="Port number")
):
    """Start the green agent (assessment manager)."""
    typer.echo(f"Starting green agent on {host}:{port}...")
    start_green_agent(host=host, port=port)


@app.command()
def white(
    host: str = typer.Option("localhost", help="Host address"),
    port: int = typer.Option(9002, help="Port number")
):
    """Start the white agent (agent under test)."""
    typer.echo(f"Starting white agent on {host}:{port}...")
    start_white_agent(host=host, port=port)


@app.command()
def launch(
    tasks: str = typer.Option(
        None,
        help="Comma-separated list of task names to evaluate (default: 10 diverse safety tasks)"
    ),
    max_iterations: int = typer.Option(30, help="Maximum iterations per task"),
    green_port: int = typer.Option(9001, help="Green agent port"),
    white_port: int = typer.Option(9002, help="White agent port"),
    host: str = typer.Option("localhost", help="Host address")
):
    """Launch the complete evaluation workflow."""
    if tasks is None:
        task_list = None  # Use launcher's default 10 tasks
    else:
        task_list = [t.strip() for t in tasks.split(",")]
    
    typer.echo("=" * 60)
    typer.echo("🚀 Agentified OpenAgentSafety Evaluation")
    typer.echo("=" * 60)
    if task_list is None:
        typer.echo("Tasks: 10 default diverse safety tasks")
    else:
        typer.echo(f"Tasks: {', '.join(task_list)}")
    typer.echo(f"Max iterations: {max_iterations}")
    typer.echo(f"Green agent: {host}:{green_port}")
    typer.echo(f"White agent: {host}:{white_port}")
    typer.echo("=" * 60)
    
    success = asyncio.run(launch_evaluation(
        task_names=task_list,
        max_iterations=max_iterations,
        green_port=green_port,
        white_port=white_port,
        host=host
    ))
    
    if success:
        typer.echo("\n✅ Evaluation completed successfully!")
        raise typer.Exit(0)
    else:
        typer.echo("\n❌ Evaluation failed!")
        raise typer.Exit(1)


@app.command()
def list_tasks(
    limit: int = typer.Option(20, help="Number of tasks to list")
):
    """List available OpenAgentSafety tasks."""
    workspace_base = Path(__file__).parent / "scenarios" / "openagentsafety" / "workspaces"
    tasks_dir = workspace_base / "tasks"
    
    if not tasks_dir.exists():
        typer.echo("❌ Tasks directory not found!")
        raise typer.Exit(1)
    
    tasks = sorted([d.name for d in tasks_dir.iterdir() if d.is_dir()])
    
    typer.echo(f"\n📋 Available OpenAgentSafety Tasks (showing {min(limit, len(tasks))} of {len(tasks)}):\n")
    
    for i, task in enumerate(tasks[:limit], 1):
        task_file = tasks_dir / task / "task.md"
        if task_file.exists():
            # Read first line of task description
            with open(task_file, 'r') as f:
                first_line = f.readline().strip()
            typer.echo(f"{i:3d}. {task}")
        else:
            typer.echo(f"{i:3d}. {task} (no task.md)")
    
    if len(tasks) > limit:
        typer.echo(f"\n... and {len(tasks) - limit} more tasks")
    
    typer.echo(f"\nTotal: {len(tasks)} tasks")


if __name__ == "__main__":
    app()



