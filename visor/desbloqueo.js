// MGS web — FeniXVOID · Project Ravenlight
export const CLAVE_DESBLOQUEO = "sm_todo_desbloqueado";

export function todoDesbloqueado() {
  try {
    return localStorage.getItem(CLAVE_DESBLOQUEO) === "1";
  } catch {
    return false;
  }
}

export function ponerTodoDesbloqueado(si, {avisar: avisar = true} = {}) {
  si = !!si;
  try {
    localStorage.setItem(CLAVE_DESBLOQUEO, si ? "1" : "0");
    if (si) localStorage.setItem("sm_todo", "1");
  } catch {}
  if (avisar) {
    try {
      dispatchEvent(new CustomEvent("mgs:opcion", {
        detail: {
          clave: "desbloqueado",
          valor: si
        }
      }));
    } catch {}
  }
  return si;
}
