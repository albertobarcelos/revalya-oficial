import typer
from pathlib import Path

from .excel_template import gerar_template
from .config import get_supabase_client
from .import_supabase import ler_planilha, importar_para_supabase


app = typer.Typer(help="CLI para geração de planilha e importação de contratos para Supabase")


@app.command()
def gerar_template_cmd(output: str = typer.Option("contratos_template.xlsx", "--output", help="Caminho do arquivo de saída")):
    """Gera a planilha de contratos configurada."""
    out = gerar_template(output)
    typer.echo(f"Template gerado em: {out}")


@app.command()
def importar(
    xlsx: str = typer.Option(..., "--xlsx", help="Caminho para a planilha preenchida"),
    tabela: str = typer.Option("contratos", "--tabela", help="Nome da tabela no Supabase"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Somente valida e mostra o resumo"),
):
    """Importa registros da planilha para o Supabase."""
    path = Path(xlsx)
    if not path.exists():
        raise typer.BadParameter(f"Arquivo não encontrado: {xlsx}")

    registros, erros = ler_planilha(str(path))
    typer.echo(f"Registros lidos: {len(registros)}")
    if erros:
        typer.echo("Erros de validação:")
        for e in erros:
            typer.echo(f"- {e}")
        if not dry_run:
            raise typer.Exit(code=1)

    if dry_run:
        typer.echo("Dry-run: nenhum dado enviado para o Supabase.")
        raise typer.Exit(code=0)

    client = get_supabase_client()
    res = importar_para_supabase(client, registros, tabela)
    typer.echo("Importação concluída.")
    typer.echo(str(res))