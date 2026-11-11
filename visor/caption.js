// MGS web — FeniXVOID · Project Ravenlight
const leer = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : v;
  } catch {
    return d;
  }
};

const escribir = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

let on = leer("sm_caption", "1") !== "0";

export const caption = {
  get on() {
    return on;
  },
  poner(si = !on) {
    on = !!si;
    escribir("sm_caption", on ? "1" : "0");
    return on;
  }
};

export const monoGuardado = () => leer("sm_mono", "0") === "1";

export const guardarMono = si => escribir("sm_mono", si ? "1" : "0");
