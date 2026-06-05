"""Dashboard analítico TaskInsight (Streamlit)."""
import os
import requests
import pandas as pd
import plotly.express as px
import streamlit as st

API_URL = os.getenv("API_URL", "http://localhost:3000")

st.set_page_config(page_title="TaskInsight • Analytics", page_icon="📊", layout="wide")

# --- estilo
st.markdown("""
<style>
:root { --primary:#f97316; }
h1, h2, h3 { color:#7c2d12; }
.stButton>button { background:var(--primary); color:white; border:0; }
</style>
""", unsafe_allow_html=True)

st.sidebar.title("TaskInsight")
st.sidebar.caption("Dashboard de Analytics")

# --- login
if "token" not in st.session_state:
    st.session_state.token = None

with st.sidebar:
    if not st.session_state.token:
        st.subheader("Entrar")
        email = st.text_input("E-mail")
        senha = st.text_input("Senha", type="password")
        if st.button("Entrar"):
            r = requests.post(
                f"{API_URL}/api/auth/login",
                json={"email": email, "senha": senha},
                timeout=10,
            )
            if r.ok:
                data = r.json()
                st.session_state.token = data["token"]
                st.session_state.user = data["usuario"]
                st.rerun()
            else:
                st.error("Credenciais inválidas")
    else:
        st.success(f"Olá, {st.session_state.user['nome']}")
        if st.button("Sair"):
            st.session_state.clear()
            st.rerun()

if not st.session_state.token:
    st.info("Faça login na barra lateral para visualizar o dashboard.")
    st.stop()

H = {"Authorization": f"Bearer {st.session_state.token}"}

# --- dados
tasks_resp = requests.get(f"{API_URL}/api/tasks", headers=H, timeout=10)
summary_resp = requests.get(f"{API_URL}/api/tasks/analytics/resumo", headers=H, timeout=10)

if not tasks_resp.ok or not summary_resp.ok:
    st.error("Erro ao carregar dados da API.")
    st.stop()

tasks = tasks_resp.json()
summary = summary_resp.json()

# por_status é lista de {_id, count} — converter para dict
status_dict = {item["_id"]: item["count"] for item in summary.get("por_status", [])}

df = pd.DataFrame(tasks)

st.title("Dashboard de Analytics")
st.caption("Visão estratégica das suas tarefas")

c1, c2, c3, c4 = st.columns(4)
c1.metric("Pendentes", status_dict.get("a_fazer", 0))
c2.metric("Em Progresso", status_dict.get("em_progresso", 0))
c3.metric("Concluídas", status_dict.get("concluido", 0))
c4.metric("Conclusão", f"{summary.get('progresso', 0)}%")

st.divider()

if df.empty:
    st.info("Nenhuma tarefa ainda. Crie tarefas no frontend para ver as métricas.")
    st.stop()

col1, col2 = st.columns(2)

with col1:
    st.subheader("Tarefas por Status")
    fig = px.bar(
        df.groupby("status").size().reset_index(name="qtd"),
        x="status", y="qtd", color="status",
        color_discrete_sequence=px.colors.sequential.Oranges_r,
    )
    st.plotly_chart(fig, use_container_width=True)

with col2:
    st.subheader("Tarefas por Prioridade")
    fig2 = px.pie(
        df, names="prioridade", hole=0.5,
        color_discrete_sequence=px.colors.sequential.Oranges_r,
    )
    st.plotly_chart(fig2, use_container_width=True)

st.subheader("Tarefas recentes")
colunas = ["tarefa", "status", "prioridade", "categoria", "createdAt"]
colunas_existentes = [c for c in colunas if c in df.columns]
st.dataframe(df[colunas_existentes], use_container_width=True, hide_index=True)
