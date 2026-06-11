"""Dashboard analítico TaskInsight (Streamlit) — Relatórios (equivalente à Tela 3).
 
Replica a Tela 3 do front-end (KPIs, gráfico de status, gráfico de
prioridade e tabela de tarefas) e adiciona um painel de filtros
(categoria, status, prioridade, tempo gasto e intervalo de prazo),
nos mesmos moldes do painel #filtersPanel da Tela 3.
"""
import html
import os
import requests
import pandas as pd
import plotly.express as px
import streamlit as st
 
API_URL = os.getenv("API_URL", "http://localhost:3000")
 
st.set_page_config(
    page_title="TaskInsight • Relatórios",
    page_icon="📊",
    layout="wide",
)
 
# --- estilo
st.markdown("""
<style>
:root { --primary:#f97316; }
h1, h2, h3 { color:#7c2d12; }
.stButton>button { background:var(--primary); color:white; border:0; }
 
/* Faz os botões "Aplicar Filtros" / "Limpar Filtros" ficarem lado a
   lado, do tamanho do texto, sem espaço extra entre eles — em
   qualquer largura de tela (independe da largura percentual das
   colunas do Streamlit). */
.st-key-filtro_botoes div[data-testid="stHorizontalBlock"] {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 10px !important;
  width: fit-content !important;
}
.st-key-filtro_botoes div[data-testid="column"] {
  width: fit-content !important;
  min-width: fit-content !important;
  flex: none !important;
}
 
/* Cores dos botões do painel de filtros: Aplicar = azul do projeto,
   Limpar = branco com borda. */
.st-key-filtro_botoes button {
  padding: 6px 18px !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  width: fit-content !important;
  white-space: nowrap !important;
}
.st-key-filtro_botoes button p {
  white-space: nowrap !important;
}
.st-key-filtro_botoes button[kind="primary"] {
  background: #5a83b7 !important;
  border: 1px solid #5a83b7 !important;
  color: #fff !important;
}
.st-key-filtro_botoes button[kind="primary"]:hover {
  background: #4a6f9c !important;
  border-color: #4a6f9c !important;
  color: #fff !important;
}
.st-key-filtro_botoes button[kind="secondary"] {
  background: #fff !important;
  border: 1px solid #e3dccb !important;
  color: #1f2a44 !important;
}
.st-key-filtro_botoes button[kind="secondary"]:hover {
  background: #f1ede2 !important;
  border-color: #e3dccb !important;
  color: #1f2a44 !important;
}
 
/* Botão "Limpar Filtros" exibido junto ao aviso de filtro ativo,
   acima dos gráficos/tabela. */
.st-key-limpar_filtros_grafico button {
  padding: 4px 14px !important;
  border-radius: 999px !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  background: #fff !important;
  border: 1px solid #e3dccb !important;
  color: #1f2a44 !important;
  white-space: nowrap !important;
}
.st-key-limpar_filtros_grafico button:hover {
  background: #f1ede2 !important;
  border-color: #e3dccb !important;
  color: #1f2a44 !important;
}
 
/* Remove completamente a barra lateral do Streamlit — o login é
   feito automaticamente via ?token= (ver auto-login abaixo) e o
   logout fica na Tela 3. */
[data-testid="stSidebar"],
[data-testid="stSidebarCollapsedControl"] {
  display: none !important;
}
</style>
""", unsafe_allow_html=True)
 
# ============================================================
# Mapeamentos de exibição (mesmos usados em frontend/tela 3/script.js)
# ============================================================
CATEGORIA_LABEL = {
    "Escrevendo Código": "Escrita de Código",
    "Cursos": "Cursos & Estudos",
    "Debugging": "Debugging & Fixes",
    "Outras Demandas": "Outras Demandas",
}
 
STATUS_LABEL = {
    "a_fazer": "A Fazer",
    "em_progresso": "Em Progresso",
    "em_revisao": "Em Revisão",
    "concluido": "Concluído",
}
STATUS_ORDEM = ["a_fazer", "em_progresso", "em_revisao", "concluido"]
STATUS_CORES = {
    "a_fazer": "#fdd9a0",
    "em_progresso": "#f7b56e",
    "em_revisao": "#f2934a",
    "concluido": "#d8843a",
}
 
PRIORIDADE_LABEL = {"alta": "Alta", "media": "Média", "baixa": "Baixa"}
PRIORIDADE_ORDEM = ["alta", "media", "baixa"]
# Mesma paleta da Tela 2/3: alta = laranja, média = bege, baixa = azul
PRIORIDADE_COR_HEX = {"alta": "#e89547", "media": "#f5e6cf", "baixa": "#5a83b7"}
 
# ============================================================
# Login (mesmo fluxo do dashboard original)
# ============================================================
if "token" not in st.session_state:
    st.session_state.token = None
 
# Auto-login: se a Tela 3 (frontend) já estiver autenticada, ela
# embute o iframe como http://localhost:8501/?token=<ti_token>.
# Aproveitamos esse token (validando na API) para não pedir login
# de novo dentro do Streamlit.
if not st.session_state.token:
    token_url = st.query_params.get("token")
    if token_url:
        try:
            r = requests.get(
                f"{API_URL}/api/users/me",
                headers={"Authorization": f"Bearer {token_url}"},
                timeout=10,
            )
            if r.ok:
                st.session_state.token = token_url
                st.session_state.user = r.json()
        except requests.RequestException:
            pass
 
if not st.session_state.token:
    st.info(
        "Acesse este relatório pela tela **Relatórios** do TaskInsight "
        "(já autenticada) — o login é feito automaticamente."
    )
    st.stop()
 
H = {"Authorization": f"Bearer {st.session_state.token}"}
 
# ============================================================
# Dados — equivalente a fetchTasks() / allTasks no script.js
# ============================================================
tasks_resp = requests.get(f"{API_URL}/api/tasks", headers=H, timeout=10)
 
if not tasks_resp.ok:
    st.error("Erro ao carregar dados da API.")
    st.stop()
 
tasks = tasks_resp.json()
df = pd.DataFrame(tasks)
 
st.title("Relatórios")
st.caption("Visão consolidada e lista completa de tarefas")
 
if df.empty:
    st.info("Nenhuma tarefa ainda. Crie tarefas no frontend para ver o relatório.")
    st.stop()
 
# Garante que as colunas usadas nos filtros sempre existam
for col in ["categoria", "status", "prioridade", "tempo_gasto", "data_limite", "createdAt"]:
    if col not in df.columns:
        df[col] = None
 
df["tempo_gasto"] = pd.to_numeric(df["tempo_gasto"], errors="coerce").fillna(0)
df["_data_limite"] = pd.to_datetime(df["data_limite"], errors="coerce")
df["_created_at"] = pd.to_datetime(df["createdAt"], errors="coerce")
 
# ============================================================
# Painel de filtros — equivalente ao #filtersPanel da Tela 3
# ============================================================
FILTER_KEYS = [
    "f_categoria", "f_status", "f_prioridade",
    "f_tempo", "f_prazo_de", "f_prazo_ate",
]
 
 
def limpar_filtros():
    """Remove as chaves dos widgets de filtro do session_state.
 
    Precisa rodar via on_click (ANTES dos widgets serem recriados no
    próximo rerun) — apagar essas chaves depois que os widgets já
    foram instanciados nesta execução geraria erro do Streamlit.
    """
    for k in FILTER_KEYS:
        st.session_state.pop(k, None)
 
 
with st.expander("🔍 Filtros", expanded=False):
    col1, col2, col3 = st.columns(3)
 
    categoria_f = col1.selectbox(
        "Categoria",
        options=["Todas"] + list(CATEGORIA_LABEL.keys()),
        format_func=lambda v: "Todas" if v == "Todas" else CATEGORIA_LABEL.get(v, v),
        key="f_categoria",
    )
    status_f = col2.selectbox(
        "Status",
        options=["Todos"] + STATUS_ORDEM,
        format_func=lambda v: "Todos" if v == "Todos" else STATUS_LABEL.get(v, v),
        key="f_status",
    )
    prioridade_f = col3.selectbox(
        "Prioridade",
        options=["Todas"] + PRIORIDADE_ORDEM,
        format_func=lambda v: "Todas" if v == "Todas" else PRIORIDADE_LABEL.get(v, v),
        key="f_prioridade",
    )
 
    col4, col5, col6 = st.columns(3)
 
    tempo_f = col4.selectbox(
        "Tempo Gasto",
        options=[0, 1, 2, 3, 5],
        format_func=lambda v: "Qualquer" if v == 0 else f"Maior que {v}h",
        key="f_tempo",
    )
    prazo_de = col5.date_input("Prazo de", value=None, format="DD/MM/YYYY", key="f_prazo_de")
    prazo_ate = col6.date_input("Prazo até", value=None, format="DD/MM/YYYY", key="f_prazo_ate")
 
    with st.container(key="filtro_botoes"):
        btn_col1, btn_col2 = st.columns(2)
        btn_col1.button("Aplicar Filtros", type="primary")
        btn_col2.button("Limpar Filtros", on_click=limpar_filtros)
 
# ============================================================
# Aplica os filtros — equivalente a applyFilters() no script.js
# ============================================================
df_filtrado = df.copy()
 
if categoria_f != "Todas":
    df_filtrado = df_filtrado[df_filtrado["categoria"] == categoria_f]
 
if status_f != "Todos":
    df_filtrado = df_filtrado[df_filtrado["status"] == status_f]
 
if prioridade_f != "Todas":
    df_filtrado = df_filtrado[df_filtrado["prioridade"] == prioridade_f]
 
# Tempo gasto: "maior que Xh" -> tempo_gasto > tempoMin
if tempo_f > 0:
    df_filtrado = df_filtrado[df_filtrado["tempo_gasto"] > tempo_f]
 
# Prazo: intervalo de datas (data_limite). Tarefas sem prazo são
# excluídas quando algum limite de data está definido.
if prazo_de or prazo_ate:
    df_filtrado = df_filtrado[df_filtrado["_data_limite"].notna()]
    if prazo_de:
        df_filtrado = df_filtrado[df_filtrado["_data_limite"].dt.date >= prazo_de]
    if prazo_ate:
        df_filtrado = df_filtrado[df_filtrado["_data_limite"].dt.date <= prazo_ate]
 
# ============================================================
# Agregados — equivalente a computeAggregates() no script.js
# ============================================================
por_status = df_filtrado["status"].value_counts().to_dict()
por_prioridade = df_filtrado["prioridade"].value_counts().to_dict()
total = len(df_filtrado)
concluidas = por_status.get("concluido", 0)
progresso = round(concluidas / total * 100) if total else 0
 
st.divider()
 
# ============================================================
# KPIs — equivalente a renderKpis()
# Renderizados como cards, espelhando o .kpi da Tela 3: todos em
# bege (#f1ede2), com o valor em destaque na cor azul do projeto.
# ============================================================
# Azul do projeto (var(--info)) — usado no valor dos 4 cards.
AZUL_PROJETO = "#5a83b7"
BEGE_PROJETO = "#f1ede2"
 
 
def _kpi_card(titulo, valor, subtitulo, bg, color, valor_color=None):
    valor_color = valor_color or color
    return f"""
    <div style="background:{bg};color:{color};border-radius:10px;padding:16px;">
      <div style="font-size:16px;font-weight:600;opacity:.85;margin-bottom:8px;">{html.escape(titulo)}</div>
      <strong style="display:block;font-size:28px;line-height:1.2;color:{valor_color};">{html.escape(str(valor))}</strong>
      <small style="font-size:13px;opacity:.85;">{html.escape(subtitulo)}</small>
    </div>
    """
 
 
c1, c2, c3, c4 = st.columns(4)
with c1:
    st.markdown(_kpi_card("Pendentes", por_status.get("a_fazer", 0), "A Fazer", BEGE_PROJETO, "#1f2a44", AZUL_PROJETO), unsafe_allow_html=True)
with c2:
    st.markdown(_kpi_card("Em Progresso", por_status.get("em_progresso", 0), "Em andamento", BEGE_PROJETO, "#1f2a44", AZUL_PROJETO), unsafe_allow_html=True)
with c3:
    st.markdown(_kpi_card("Concluídas", por_status.get("concluido", 0), "Finalizadas", BEGE_PROJETO, "#1f2a44", AZUL_PROJETO), unsafe_allow_html=True)
with c4:
    st.markdown(_kpi_card("% Conclusão", f"{progresso}%", "Indicador", BEGE_PROJETO, "#1f2a44", AZUL_PROJETO), unsafe_allow_html=True)
 
st.divider()
 
if df_filtrado.empty:
    st.info("Nenhuma tarefa encontrada para os filtros selecionados.")
    st.stop()
 
# ============================================================
# Gráficos — equivalentes a renderStatusChart() e renderPriorityChart()
# ============================================================
filtros_ativos = (
    categoria_f != "Todas"
    or status_f != "Todos"
    or prioridade_f != "Todas"
    or tempo_f != 0
    or prazo_de is not None
    or prazo_ate is not None
)
 
if filtros_ativos:
    col_badge, col_clear = st.columns([5, 1], vertical_alignment="center")
    with col_badge:
        st.markdown(
            """
            <div style="display:inline-flex;align-items:center;gap:6px;background:#e0eaf6;
                         color:#2f578a;border-radius:999px;padding:4px 14px;font-size:12px;
                         font-weight:700;margin-bottom:10px;">
              🔍 Filtro ativo — gráficos e tarefas refletem os filtros selecionados
            </div>
            """,
            unsafe_allow_html=True,
        )
    with col_clear:
        st.button(
            "✕ Limpar Filtros",
            key="limpar_filtros_grafico",
            on_click=limpar_filtros,
        )
 
col_a, col_b = st.columns(2)
 
with col_a:
    st.subheader("Tarefas por Status")
    status_df = pd.DataFrame({
        "status": [STATUS_LABEL[s] for s in STATUS_ORDEM],
        "qtd": [por_status.get(s, 0) for s in STATUS_ORDEM],
        "cor": [STATUS_CORES[s] for s in STATUS_ORDEM],
    })
    fig = px.bar(
        status_df, x="status", y="qtd", color="status",
        color_discrete_map=dict(zip(status_df["status"], status_df["cor"])),
    )
    fig.update_layout(showlegend=False, xaxis_title=None, yaxis_title=None)
    st.plotly_chart(fig, use_container_width=True)
 
with col_b:
    st.subheader("Tarefas por Prioridade")
    presentes = [p for p in PRIORIDADE_ORDEM if por_prioridade.get(p, 0) > 0]
    if presentes:
        prioridade_df = pd.DataFrame({
            "prioridade": [PRIORIDADE_LABEL[p] for p in presentes],
            "qtd": [por_prioridade.get(p, 0) for p in presentes],
            "cor": [PRIORIDADE_COR_HEX[p] for p in presentes],
        })
        fig2 = px.pie(
            prioridade_df, names="prioridade", values="qtd", hole=0.55,
            color="prioridade",
            color_discrete_map=dict(zip(prioridade_df["prioridade"], prioridade_df["cor"])),
        )
        st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("Sem dados de prioridade para exibir.")
 
# ============================================================
# Tabela "Todas as Tarefas" — equivalente a renderTasksTable()
# Usa st.dataframe (nativo) para permitir ordenar clicando no
# cabeçalho de qualquer coluna. Mantém as cores de Status/Prioridade
# (mesma paleta da Tela 3) via pandas Styler.
# ============================================================
st.subheader("Todas as Tarefas")
 
# Mesmas cores de "etiqueta" usadas na tabela da Tela 3
# (.tag-alta, .tag-media, .tag-baixa, .tag-status)
PRIORIDADE_CORES = {
    "Alta": ("#fde0dc", "#b03a2e"),
    "Média": ("#f5e6cf", "#8a5b1e"),
    "Baixa": ("#e0eaf6", "#2f578a"),
}
STATUS_COR = ("#f1ede2", "#1f2a44")
 
tabela_disp = pd.DataFrame({
    "Tarefa": df_filtrado["tarefa"],
    "Categoria": df_filtrado["categoria"].map(CATEGORIA_LABEL).fillna(df_filtrado["categoria"]),
    "Status": df_filtrado["status"].map(STATUS_LABEL).fillna(df_filtrado["status"]),
    "Prioridade": df_filtrado["prioridade"].map(PRIORIDADE_LABEL).fillna(df_filtrado["prioridade"]),
    "Tempo Gasto": df_filtrado["tempo_gasto"],
    "Prazo": df_filtrado["_data_limite"],
    "Criada em": df_filtrado["_created_at"],
}).sort_values("Criada em", ascending=False)
 
 
def _cor_status(_valor):
    bg, fg = STATUS_COR
    return f"background-color:{bg};color:{fg};font-weight:700;border-radius:6px;"
 
 
def _cor_prioridade(valor):
    bg, fg = PRIORIDADE_CORES.get(valor, ("", "#1f2a44"))
    if not bg:
        return ""
    return f"background-color:{bg};color:{fg};font-weight:700;border-radius:6px;"
 
 
def _fmt_data(d):
    return d.strftime("%d/%m/%Y") if pd.notna(d) else "—"
 
 
styler = (
    tabela_disp.style
    .map(_cor_status, subset=["Status"])
    .map(_cor_prioridade, subset=["Prioridade"])
    .format({
        "Tempo Gasto": "{:g}h",
        "Prazo": _fmt_data,
        "Criada em": _fmt_data,
    })
)
 
st.dataframe(styler, use_container_width=True, hide_index=True)
st.caption("Clique no cabeçalho de uma coluna para ordenar a tabela.")