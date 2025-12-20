#!/usr/bin/env python3
"""
Script para extrair todas as estruturas do banco de dados exceto tabelas
dos arquivos de migração do Supabase.

Extrai:
- Extensions
- Types (ENUMs)
- Functions
- Triggers
- Policies (RLS)
- Views
- Sequences
- Grants relacionados
- Comentários
- Schemas
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

def extract_block(lines: List[str], start_idx: int, start_pattern: str, end_pattern: str) -> Tuple[str, int]:
    """
    Extrai um bloco de código que começa com start_pattern e termina com end_pattern.
    Retorna o bloco e o índice da última linha processada.
    """
    block_lines = [lines[start_idx]]
    i = start_idx + 1
    
    while i < len(lines):
        block_lines.append(lines[i])
        if re.search(end_pattern, lines[i], re.IGNORECASE):
            return '\n'.join(block_lines), i
        i += 1
    
    # Se não encontrou o fim, retorna o que tem
    return '\n'.join(block_lines), i - 1

def extract_functions(content: str) -> List[str]:
    """Extrai todas as functions do conteúdo."""
    functions = []
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        if re.search(r'CREATE OR REPLACE FUNCTION', line, re.IGNORECASE):
            # Encontrar o bloco completo da function
            block, end_idx = extract_block(lines, i, r'CREATE OR REPLACE FUNCTION', r'^\$\$;')
            functions.append(block)
            i = end_idx + 1
        else:
            i += 1
    
    return functions

def extract_triggers(content: str) -> List[str]:
    """Extrai todos os triggers do conteúdo."""
    triggers = []
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        if re.search(r'CREATE OR REPLACE TRIGGER', line, re.IGNORECASE):
            # Trigger geralmente termina na mesma linha ou próxima
            trigger_lines = [line]
            i += 1
            # Continuar até encontrar ponto e vírgula
            while i < len(lines) and ';' not in line:
                if i < len(lines):
                    trigger_lines.append(lines[i])
                    line = lines[i]
                i += 1
            triggers.append('\n'.join(trigger_lines))
        else:
            i += 1
    
    return triggers

def extract_policies(content: str) -> List[str]:
    """Extrai todas as policies do conteúdo."""
    policies = []
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        if re.search(r'CREATE POLICY', line, re.IGNORECASE):
            policy_lines = [line]
            i += 1
            # Continuar até encontrar ponto e vírgula
            while i < len(lines) and ';' not in line:
                if i < len(lines):
                    policy_lines.append(lines[i])
                    line = lines[i]
                i += 1
            policies.append('\n'.join(policy_lines))
        else:
            i += 1
    
    return policies

def extract_non_table_objects(schema_file, data_file, roles_file):
    """Extrai todas as estruturas exceto tabelas dos arquivos de migração."""
    
    output_lines = []
    
    # Adicionar cabeçalho
    output_lines.append("-- ============================================")
    output_lines.append("-- MIGRAÇÃO: Estruturas do Banco (sem tabelas)")
    output_lines.append("-- Extraído automaticamente dos arquivos de migração")
    output_lines.append("-- ============================================")
    output_lines.append("")
    output_lines.append("SET statement_timeout = 0;")
    output_lines.append("SET lock_timeout = 0;")
    output_lines.append("SET idle_in_transaction_session_timeout = 0;")
    output_lines.append("SET client_encoding = 'UTF8';")
    output_lines.append("SET standard_conforming_strings = on;")
    output_lines.append("SELECT pg_catalog.set_config('search_path', '', false);")
    output_lines.append("SET check_function_bodies = false;")
    output_lines.append("SET xmloption = content;")
    output_lines.append("SET client_min_messages = warning;")
    output_lines.append("SET row_security = off;")
    output_lines.append("")
    
    # Processar schema.sql
    if schema_file.exists():
        print(f"Processando {schema_file}...")
        with open(schema_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        
        # Extrair schemas
        schema_pattern = r'CREATE SCHEMA IF NOT EXISTS'
        schemas = []
        i = 0
        while i < len(lines):
            if re.search(schema_pattern, lines[i], re.IGNORECASE):
                schema_lines = []
                j = i
                while j < len(lines) and ';' not in lines[j]:
                    schema_lines.append(lines[j])
                    j += 1
                if j < len(lines):
                    schema_lines.append(lines[j])
                schemas.append('\n'.join(schema_lines))
                i = j + 1
            else:
                i += 1
        
        if schemas:
            output_lines.append("-- ============================================")
            output_lines.append("-- SCHEMAS")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for schema in schemas:
                output_lines.append(schema)
                output_lines.append("")
            
            # ALTER SCHEMA
            alter_schema_pattern = r'ALTER SCHEMA[^;]+;'
            alter_schemas = re.findall(alter_schema_pattern, content, re.IGNORECASE | re.MULTILINE)
            for alter in alter_schemas:
                output_lines.append(alter)
                output_lines.append("")
        
        # Extrair extensions
        extension_pattern = r'CREATE EXTENSION IF NOT EXISTS[^;]+;'
        extensions = re.findall(extension_pattern, content, re.IGNORECASE | re.MULTILINE)
        if extensions:
            output_lines.append("-- ============================================")
            output_lines.append("-- EXTENSIONS")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for ext in extensions:
                output_lines.append(ext)
                output_lines.append("")
        
        # Extrair types (ENUMs) - processar linha por linha
        types = []
        i = 0
        while i < len(lines):
            if re.search(r'CREATE TYPE', lines[i], re.IGNORECASE):
                type_lines = []
                j = i
                paren_count = 0
                found_paren = False
                while j < len(lines):
                    type_lines.append(lines[j])
                    if '(' in lines[j]:
                        found_paren = True
                        paren_count += lines[j].count('(') - lines[j].count(')')
                    elif found_paren:
                        paren_count += lines[j].count('(') - lines[j].count(')')
                    if found_paren and paren_count == 0 and ';' in lines[j]:
                        break
                    j += 1
                types.append('\n'.join(type_lines))
                i = j + 1
            else:
                i += 1
        
        if types:
            output_lines.append("-- ============================================")
            output_lines.append("-- TYPES (ENUMs)")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for type_def in types:
                output_lines.append(type_def)
                output_lines.append("")
            
            # ALTER TYPE
            alter_type_pattern = r'ALTER TYPE[^;]+OWNER TO[^;]+;'
            alter_types = re.findall(alter_type_pattern, content, re.IGNORECASE | re.MULTILINE)
            for alter in alter_types:
                output_lines.append(alter)
                output_lines.append("")
        
        # Extrair functions
        print("  Extraindo functions...")
        functions = extract_functions(content)
        if functions:
            output_lines.append("-- ============================================")
            output_lines.append("-- FUNCTIONS")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for func in functions:
                output_lines.append(func)
                output_lines.append("")
            
            # ALTER FUNCTION
            alter_function_pattern = r'ALTER FUNCTION[^;]+OWNER TO[^;]+;'
            alter_functions = re.findall(alter_function_pattern, content, re.IGNORECASE | re.MULTILINE)
            for alter in alter_functions:
                output_lines.append(alter)
                output_lines.append("")
            
            # COMMENT ON FUNCTION
            comment_function_pattern = r'COMMENT ON FUNCTION[^;]+;'
            comment_functions = re.findall(comment_function_pattern, content, re.IGNORECASE | re.MULTILINE)
            for comment in comment_functions:
                output_lines.append(comment)
                output_lines.append("")
        
        # Extrair triggers
        print("  Extraindo triggers...")
        triggers = extract_triggers(content)
        if triggers:
            output_lines.append("-- ============================================")
            output_lines.append("-- TRIGGERS")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for trigger in triggers:
                output_lines.append(trigger)
                output_lines.append("")
            
            # ALTER TABLE ... DISABLE TRIGGER
            disable_trigger_pattern = r'ALTER TABLE[^;]+DISABLE TRIGGER[^;]+;'
            disable_triggers = re.findall(disable_trigger_pattern, content, re.IGNORECASE | re.MULTILINE)
            for disable in disable_triggers:
                output_lines.append(disable)
                output_lines.append("")
            
            # COMMENT ON TRIGGER
            comment_trigger_pattern = r'COMMENT ON TRIGGER[^;]+;'
            comment_triggers = re.findall(comment_trigger_pattern, content, re.IGNORECASE | re.MULTILINE)
            for comment in comment_triggers:
                output_lines.append(comment)
                output_lines.append("")
        
        # Extrair views
        view_pattern = r'CREATE (OR REPLACE )?(VIEW|MATERIALIZED VIEW)'
        views = []
        i = 0
        while i < len(lines):
            if re.search(view_pattern, lines[i], re.IGNORECASE):
                view_lines = []
                j = i
                while j < len(lines) and ';' not in lines[j]:
                    view_lines.append(lines[j])
                    j += 1
                if j < len(lines):
                    view_lines.append(lines[j])
                views.append('\n'.join(view_lines))
                i = j + 1
            else:
                i += 1
        
        if views:
            output_lines.append("-- ============================================")
            output_lines.append("-- VIEWS")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for view in views:
                output_lines.append(view)
                output_lines.append("")
        
        # Extrair sequences
        sequence_pattern = r'CREATE (SEQUENCE|TEMPORARY SEQUENCE)'
        sequences = []
        i = 0
        while i < len(lines):
            if re.search(sequence_pattern, lines[i], re.IGNORECASE):
                seq_lines = []
                j = i
                while j < len(lines) and ';' not in lines[j]:
                    seq_lines.append(lines[j])
                    j += 1
                if j < len(lines):
                    seq_lines.append(lines[j])
                sequences.append('\n'.join(seq_lines))
                i = j + 1
            else:
                i += 1
        
        if sequences:
            output_lines.append("-- ============================================")
            output_lines.append("-- SEQUENCES")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for seq in sequences:
                output_lines.append(seq)
                output_lines.append("")
        
        # Extrair policies
        print("  Extraindo policies...")
        policies = extract_policies(content)
        if policies:
            output_lines.append("-- ============================================")
            output_lines.append("-- POLICIES (RLS)")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for policy in policies:
                output_lines.append(policy)
                output_lines.append("")
        
        # Extrair ALTER POLICY
        alter_policy_pattern = r'ALTER POLICY[^;]+;'
        alter_policies = re.findall(alter_policy_pattern, content, re.IGNORECASE | re.MULTILINE)
        if alter_policies:
            for alter in alter_policies:
                output_lines.append(alter)
                output_lines.append("")
        
        # Extrair GRANTs relacionados a functions, sequences, etc (não tabelas)
        print("  Extraindo grants...")
        grant_pattern = r'GRANT[^;]+ON (FUNCTION|SEQUENCE|TYPE|SCHEMA)[^;]+;'
        grants = re.findall(grant_pattern, content, re.IGNORECASE | re.MULTILINE)
        if grants:
            output_lines.append("-- ============================================")
            output_lines.append("-- GRANTS (Functions, Sequences, Types, Schemas)")
            output_lines.append("-- ============================================")
            output_lines.append("")
            # Buscar as linhas completas de GRANT
            grant_full_pattern = r'GRANT[^;]+ON (FUNCTION|SEQUENCE|TYPE|SCHEMA)[^;]+;'
            grant_matches = re.finditer(grant_full_pattern, content, re.IGNORECASE | re.MULTILINE)
            for match in grant_matches:
                output_lines.append(match.group(0))
                output_lines.append("")
    
    # Processar roles.sql
    if roles_file.exists():
        print(f"Processando {roles_file}...")
        with open(roles_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        output_lines.append("-- ============================================")
        output_lines.append("-- ROLES E CONFIGURAÇÕES")
        output_lines.append("-- ============================================")
        output_lines.append("")
        output_lines.append(content)
        output_lines.append("")
    
    # Processar data.sql - apenas estruturas, não dados
    if data_file.exists():
        print(f"Processando {data_file}...")
        with open(data_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extrair apenas estruturas de data.sql (functions, triggers, etc)
        # Não extrair INSERT, UPDATE, DELETE
        
        # Functions em data.sql
        functions = extract_functions(content)
        if functions:
            output_lines.append("-- ============================================")
            output_lines.append("-- FUNCTIONS (de data.sql)")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for func in functions:
                output_lines.append(func)
                output_lines.append("")
        
        # Triggers em data.sql
        triggers = extract_triggers(content)
        if triggers:
            output_lines.append("-- ============================================")
            output_lines.append("-- TRIGGERS (de data.sql)")
            output_lines.append("-- ============================================")
            output_lines.append("")
            for trigger in triggers:
                output_lines.append(trigger)
                output_lines.append("")
    
    # Adicionar rodapé
    output_lines.append("")
    output_lines.append("-- ============================================")
    output_lines.append("-- FIM DA MIGRAÇÃO")
    output_lines.append("-- ============================================")
    
    return '\n'.join(output_lines)

def main():
    """Função principal."""
    migrations_dir = Path('supabase/migrations')
    
    schema_file = migrations_dir / 'schema.sql'
    data_file = migrations_dir / 'data.sql'
    roles_file = migrations_dir / 'roles.sql'
    
    if not schema_file.exists():
        print(f"Erro: {schema_file} não encontrado!")
        sys.exit(1)
    
    print("Extraindo estruturas do banco (exceto tabelas)...")
    print("=" * 60)
    
    output_content = extract_non_table_objects(schema_file, data_file, roles_file)
    
    output_file = migrations_dir / 'functions_triggers_policies.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(output_content)
    
    print("=" * 60)
    print(f"[OK] Arquivo gerado: {output_file}")
    print(f"[INFO] Tamanho: {len(output_content)} caracteres")
    print(f"[INFO] Linhas: {len(output_content.splitlines())}")

if __name__ == '__main__':
    main()
