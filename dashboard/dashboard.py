"""Dashboard analítico TaskInsight (Streamlit)."""
import os
import requests
import pandas as pd
import plotly.express as px
import streamlit as st

API_URL = os.getenv("API_URL", "http://localhost:5000")

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
        password = st.text_input("Senha", type="password")
        if st.button("Entrar"):
            r = requests.post(f"{API_URL}/auth/login", json={"email": email, "password": password}, timeout=10)
            if r.ok:
                st.session_state.token = r.json()["token"]
                st.session_state.user = r.json()["user"]
                st.rerun()
            else:
                st.error("Credenciais inválidas")
    else:
        st.success(f"Olá, {st.session_state.user['name']}")
        if st.button("Sair"):
            st.session_state.clear(); st.rerun()

if not st.session_state.token:
    st.info("Faça login na barra lateral para visualizar o dashboard.")
    st.stop()

H = {"Authorization": f"Bearer {st.session_state.token}"}

# --- dados
tasks = requests.get(f"{API_URL}/tasks", headers=H, timeout=10).json()
summary = requests.get(f"{API_URL}/metrics/summary", headers=H, timeout=10).json()

df = pd.DataFrame(tasks)

st.title("Dashboard de Analytics")
st.caption("Visão estratégica das suas tarefas")

c1, c2, c3, c4 = st.columns(4)
c1.metric("Pendentes", summary["by_status"].get("a_fazer", 0))
c2.metric("Em Progresso", summary["by_status"].get("em_progresso", 0))
c3.metric("Concluídas", summary["by_status"].get("concluido", 0))
c4.metric("Conclusão", f"{summary['completion_rate']}%")

st.divider()

if df.empty:
    st.info("Nenhuma tarefa ainda. Crie tarefas no frontend para ver as métricas.")
    st.stop()

col1, col2 = st.columns(2)

with col1:
    st.subheader("Tarefas por Status")
    fig = px.bar(df.groupby("status").size().reset_index(name="qtd"),
                 x="status", y="qtd", color="status",
                 color_discrete_sequence=px.colors.sequential.Oranges_r)
    st.plotly_chart(fig, use_container_width=True)

with col2:
    st.subheader("Tarefas por Prioridade")
    fig2 = px.pie(df, names="priority", hole=0.5,
                  color_discrete_sequence=px.colors.sequential.Oranges_r)
    st.plotly_chart(fig2, use_container_width=True)

st.subheader("Tarefas recentes")
st.dataframe(df[["title", "status", "priority", "category", "created_at"]],
             use_container_width=True, hide_index=True)
