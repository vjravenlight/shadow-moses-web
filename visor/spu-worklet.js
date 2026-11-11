// MGS web — FeniXVOID · Project Ravenlight
const RATE = 44100, TICK = 448;

const FILT = [ [ 0, 0 ], [ 60, 0 ], [ 115, -52 ], [ 98, -55 ], [ 122, -60 ] ];

class Voz {
  constructor(spu) {
    this.spu = spu;
    this.on = false;
    this.volL = 0;
    this.volR = 0;
    this.pitch = 4096;
    this.start = 0;
    this.amode = 1;
    this.ar = 0;
    this.dr = 0;
    this.smode = 3;
    this.sr = 0;
    this.sl = 0;
    this.rmode = 3;
    this.rr = 0;
    this.rev = false;
  }
  keyOn() {
    this.on = true;
    this.addr = this.start;
    this.loop = this.start;
    this.cnt = 0;
    this.s1 = 0;
    this.s2 = 0;
    this.buf = new Int16Array(28);
    this.bi = 28;
    this.fase = 0;
    this.nivel = 0;
    this.envCiclos = 0;
    this.prev = 0;
    this.cur = 0;
    this.primero = true;
  }
  keyOff() {
    if (this.on && this.fase < 3) {
      this.fase = 3;
      this.envCiclos = 0;
    }
  }
  bloque() {
    const ram = this.spu.ram;
    let a = this.addr & 524272;
    const h = ram[a], fl = ram[a + 1], sh = h & 15, f = Math.min(4, h >> 4);
    if (fl & 4) this.loop = a;
    const [k1, k2] = FILT[f];
    for (let i = 0; i < 28; i++) {
      const b = ram[a + 2 + (i >> 1)];
      let n = i & 1 ? b >> 4 : b & 15;
      if (n & 8) n -= 16;
      let s = (n << 12 >> sh) + (this.s1 * k1 + this.s2 * k2 + 32 >> 6);
      s = s < -32768 ? -32768 : s > 32767 ? 32767 : s;
      this.buf[i] = s;
      this.s2 = this.s1;
      this.s1 = s;
    }
    this.fl = fl;
    this.addr = a + 16;
    this.bi = 0;
  }
  muestra() {
    if (this.bi >= 28) {
      if (!this.primero && this.fl & 1) {
        if (this.fl & 2) this.addr = this.loop; else {
          this.on = false;
          this.nivel = 0;
          return 0;
        }
      }
      this.primero = false;
      this.bloque();
    }
    return this.buf[this.bi++];
  }
  paso(rate, baja, expo) {
    const shift = rate >> 2, r = rate & 3;
    let st = baja ? -8 + r : 7 - r;
    let ciclos = 1 << Math.max(0, shift - 11);
    st = st * (1 << Math.max(0, 11 - shift));
    if (expo && !baja && this.nivel > 24576) ciclos *= 4;
    if (expo && baja) st = st * this.nivel >> 15;
    if (++this.envCiclos >= ciclos) {
      this.envCiclos = 0;
      this.nivel += st;
    }
  }
  envolvente() {
    switch (this.fase) {
     case 0:
      this.paso(this.ar, false, this.amode === 5);
      if (this.nivel >= 32767) {
        this.nivel = 32767;
        this.fase = 1;
      }
      break;

     case 1:
      this.paso(this.dr * 4, true, true);
      if (this.nivel <= (this.sl + 1) * 2048) {
        this.fase = 2;
      }
      break;

     case 2:
      this.paso(this.sr, this.smode === 3 || this.smode === 7, this.smode >= 5);
      break;

     case 3:
      this.paso(this.rr * 4, true, this.rmode === 7);
      if (this.nivel <= 0) {
        this.nivel = 0;
        this.on = false;
      }
      break;
    }
    if (this.nivel < 0) this.nivel = 0;
    if (this.nivel > 32767) this.nivel = 32767;
  }
  render() {
    if (!this.on) return 0;
    this.cnt += Math.min(this.pitch, 16383);
    while (this.cnt >= 4096) {
      this.cnt -= 4096;
      this.prev = this.cur;
      this.cur = this.muestra();
      if (!this.on) return 0;
    }
    const s = this.prev + (this.cur - this.prev) * this.cnt / 4096;
    this.envolvente();
    return s * this.nivel / 32768;
  }
}

const PANT = [ 0, 2, 4, 7, 10, 13, 16, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60, 65, 70, 75, 80, 84, 88, 92, 96, 100, 104, 107, 110, 112, 114, 116, 118, 120, 122, 123, 124, 125, 126, 127, 127 ];

const SE_PANT = [ 0, 2, 4, 6, 8, 10, 14, 18, 22, 28, 34, 40, 46, 52, 58, 64, 70, 76, 82, 88, 94, 100, 106, 112, 118, 124, 130, 136, 142, 148, 154, 160, 166, 172, 178, 183, 188, 193, 198, 203, 208, 213, 217, 221, 224, 227, 230, 233, 236, 238, 240, 242, 244, 246, 248, 249, 250, 251, 252, 253, 254, 254, 255, 255, 255 ];

const FREQ = [ 267, 283, 300, 318, 337, 357, 378, 401, 425, 450, 477, 505, 535, 567, 601, 637, 675, 715, 757, 802, 850, 901, 954, 1011, 1071, 1135, 1202, 1274, 1350, 1430, 1515, 1605, 1701, 1802, 1909, 2022, 2143, 2270, 2405, 2548, 2700, 2860, 3030, 3211, 3402, 3604, 3818, 4045, 4286, 4541, 4811, 5097, 5400, 5721, 6061, 6422, 6804, 7208, 7637, 8091, 8572, 9082, 9622, 10194, 10800, 11442, 12122, 12844, 13608, 14416, 15276, 16182, 33, 35, 38, 40, 42, 45, 47, 50, 53, 56, 60, 63, 66, 70, 75, 79, 84, 89, 94, 100, 106, 112, 119, 126, 133, 141, 150, 159, 168, 178, 189, 200, 212, 225, 238, 252 ];

const VIBX = [ 0, 32, 56, 80, 104, 128, 144, 160, 176, 192, 208, 224, 232, 240, 240, 248, 255, 248, 244, 240, 232, 224, 208, 192, 176, 160, 144, 128, 104, 80, 56, 32 ];

const RDM = [ 159, 60, 178, 82, 175, 69, 199, 137, 16, 127, 224, 157, 220, 31, 97, 22, 57, 201, 156, 235, 87, 8, 102, 248, 90, 36, 191, 14, 62, 21, 75, 219, 171, 245, 49, 12, 67, 2, 85, 222, 65, 218, 189, 174, 25, 176, 72, 87, 186, 163, 54, 11, 249, 223, 23, 168, 4, 12, 224, 145, 24, 93, 221, 211, 40, 138, 242, 17, 89, 111, 6, 10, 52, 42, 121, 172, 94, 167, 131, 198, 57, 193, 180, 58, 63, 254, 79, 239, 31, 0, 48, 153, 76, 40, 131, 237, 138, 47, 44, 102, 63, 214, 108, 183, 73, 34, 188, 101, 250, 207, 2, 177, 70, 240, 154, 215, 226, 15, 17, 197, 116, 246, 122, 44, 143, 251, 25, 106, 229 ];

const s8 = v => (v & 255 ^ 128) - 128;

function pistaNueva() {
  return {
    buf: null,
    p: 0,
    activo: false,
    ngc: 1,
    ngo: 0,
    ngs: 0,
    ngg: 0,
    lp1_cnt: 0,
    lp2_cnt: 0,
    lp1_vol: 0,
    lp2_vol: 0,
    lp1_freq: 0,
    lp2_freq: 0,
    lp1: -1,
    lp2: -1,
    lp3: -1,
    kakfg: 0,
    kak1: 0,
    kak2: 0,
    pvoc: 0,
    pvod: 127,
    pvoad: 0,
    pvom: 0,
    vol: 127,
    panc: 0,
    pand: 2560,
    panad: 0,
    panm: 0,
    panf: 10,
    panoff: 0,
    panmod: 0,
    swpc: 0,
    swphc: 0,
    swpd: 0,
    swpad: 0,
    swpm: 0,
    swsc: 0,
    swshc: 0,
    swsk: 0,
    swss: 0,
    vibhc: 0,
    vib_tmp_cnt: 0,
    vib_tbl_cnt: 0,
    vib_tc_ofst: 1,
    vibcc: 0,
    vibd: 0,
    vibdm: 0,
    vibhs: 0,
    vibcs: 0,
    vibcad: 0,
    vibad: 0,
    rdmc: 0,
    rdmo: 0,
    rdms: 0,
    rdmd: 0,
    trec: 0,
    trehc: 0,
    tred: 0,
    trecad: 0,
    trehs: 0,
    snos: 0,
    ptps: 0,
    dec_vol: 0,
    tund: 0,
    tmp: 255,
    tmpd: 1,
    tmpc: 0,
    tmpw: 0,
    tmpm: 0,
    tmpad: 0,
    rest_fg: 0,
    macro: 0,
    micro: 0,
    rrd: 0
  };
}

function regNuevo() {
  return {
    vol_l: 0,
    vol_r: 0,
    vol_fg: 0,
    pitch: 0,
    pitch_fg: 0,
    addr: 0,
    addr_fg: 0,
    a_mode: 1,
    ar: 0,
    dr: 0,
    env1_fg: 0,
    s_mode: 3,
    sr: 0,
    sl: 0,
    env2_fg: 0,
    r_mode: 3,
    rr: 0,
    env3_fg: 0
  };
}

class Driver {
  constructor(spu) {
    this.spu = spu;
    this.w = Array.from({
      length: 21
    }, pistaNueva);
    this.tr = Array.from({
      length: 21
    }, regNuevo);
    this.voces = [];
    this.sng = null;
    this.efx = null;
    this.res = {};
    this.song_end = 2097151;
    this.keyons = 0;
    this.keyoffs = 0;
    this.eons = 0;
    this.eoffs = 0;
    this.sng_status = 2;
    this.sng_play_code = 0;
    this.codigos = [];
    this.fade_time = new Array(13).fill(0);
    this.fade_value = new Array(13).fill(0);
    this.master = new Array(13).fill(65536);
    this.fadein_time = 0;
    this.fout_term = 0;
    this.kaihi_fg = 0;
    this.kaihi_time = 0;
    this.fadein_fg = 0;
    this.se_playing = Array.from({
      length: 8
    }, () => ({
      code: 0,
      pri: 0,
      kind: 0,
      character: 0,
      buf: null,
      p: 0
    }));
    this.se_request = Array.from({
      length: 8
    }, () => ({
      code: 0,
      pri: 0,
      kind: 0,
      character: 0,
      buf: null,
      p: 0
    }));
    this.se_vol = new Array(8).fill(0);
    this.se_pan = new Array(8).fill(32);
    this.stop_jouchuu_se = 0;
    this.pausa = false;
    this.se_fuente = new Array(8).fill(0);
  }
  get s() {
    return this.w[this.mt];
  }
  tone_set(n) {
    const v = this.voces[n & 255];
    const r = this.tr[this.mt], s = this.s;
    if (!v) return;
    r.addr = v.addr;
    r.addr_fg = 1;
    s.macro = v.note;
    s.micro = v.tune;
    r.a_mode = v.a_mode ? 5 : 1;
    r.ar = ~v.ar & 127;
    r.dr = ~v.dr & 15;
    r.env1_fg = 1;
    r.s_mode = [ 3, 7, 1 ][v.s_mode] ?? 5;
    r.sr = ~v.sr & 127;
    r.sl = v.sl & 15;
    r.env2_fg = 1;
    r.r_mode = v.r_mode ? 7 : 3;
    r.rr = s.rrd = ~v.rr & 31;
    r.env3_fg = 1;
    if (!s.panmod && !s.panoff) {
      s.panf = 2 * v.pan;
      s.pand = v.pan << 9;
    }
    s.dec_vol = v.decl_vol;
  }
  keyon() {
    this.keyons |= this.keyd;
  }
  keyoff() {
    this.keyoffs |= this.keyd;
  }
  freq_set(nt) {
    const s = this.s;
    nt = nt + s8(s.micro) >>> 0;
    const t4 = nt & 255, t3 = (nt >> 8 & 255) + s.macro & 127;
    let f = (FREQ[t3 + 1] ?? FREQ[t3]) - FREQ[t3];
    if (f & 32768 || f < 0) f = 201;
    f = ((f & 255) * t4 >> 8) + (f >> 8 & 255) * t4 + FREQ[t3];
    this.tr[this.mt].pitch = f & 65535;
    this.tr[this.mt].pitch_fg = 1;
  }
  vol_set(vd) {
    const s = this.s, r = this.tr[this.mt], mt = this.mt;
    vd = vd >= s.dec_vol ? vd - s.dec_vol : 0;
    if (mt < 13 || this.se_playing[mt - 13].kind === 0) {
      let pan = Math.min(40, s.pand >> 8);
      if (this.sound_mono_fg) pan = 20;
      if (mt < 13) {
        r.vol_r = vd * PANT[pan] * this.master[mt] / 65536;
        r.vol_l = vd * PANT[40 - pan] * this.master[mt] / 65536;
      } else {
        r.vol_r = vd * PANT[pan];
        r.vol_l = vd * PANT[40 - pan];
      }
    } else {
      const pan = this.sound_mono_fg ? 32 : this.se_pan[mt - 13];
      vd = vd * this.se_vol[mt - 13] >> 16;
      r.vol_r = vd * SE_PANT[pan];
      r.vol_l = vd * SE_PANT[64 - pan];
    }
    r.vol_fg = 1;
  }
  volxset(depth) {
    const s = this.s;
    let v = s.vol - depth + s.lp1_vol + s.lp2_vol;
    v = v < 0 ? 0 : v >= 128 ? 127 : v;
    this.vol_set((s.pvod >> 8 & 255) * v >> 8 & 255);
  }
  cmd(c, d2, d3, d4) {
    const s = this.s, r = this.tr[this.mt];
    switch (c) {
     case 80:
      s.tmp = d2;
      break;

     case 81:
      {
        s.tmpc = d2;
        s.tmpm = d3;
        s.tmpw = s.tmp << 8;
        let t = d3 - s.tmp;
        if (t < 0) {
          if (t < -127) t = -127;
          s.tmpad = -Math.min(2032, (-t << 8) / Math.max(1, d2) | 0);
        } else {
          if (t > 127) t = 127;
          s.tmpad = Math.min(2032, (t << 8) / Math.max(1, d2) | 0);
        }
        break;
      }

     case 82:
     case 83:
     case 84:
      s.snos = d2;
      this.keyoff();
      this.tone_set(d2);
      break;

     case 85:
      s.pvod = d2 << 8;
      s.pvoc = 0;
      break;

     case 86:
      {
        s.pvoc = d2;
        s.pvom = d3;
        const v = (d3 << 8) - s.pvod;
        s.pvoad = v < 0 ? -Math.min(2032, -v / s.pvoc | 0) : Math.min(2032, v / s.pvoc | 0);
        break;
      }

     case 87:
      r.a_mode = 1;
      r.ar = ~d2 & 127;
      r.dr = ~d3 & 15;
      r.sl = d4 & 15;
      r.env1_fg = 1;
      break;

     case 88:
      r.s_mode = 3;
      r.sr = ~d2 & 127;
      r.env2_fg = 1;
      break;

     case 89:
      {
        const f = ~d2 & 31;
        r.r_mode = 3;
        r.rr = f;
        s.rrd = f;
        r.env3_fg = 1;
        break;
      }

     case 93:
      s.panmod = d2;
      s.panf = d3 + 20;
      s.pand = s.panf << 8;
      s.panc = 0;
      break;

     case 94:
      {
        s.panc = d2;
        const ps = d3 + 20 & 255;
        s.panm = ps << 8;
        const pd = ps - s.panf;
        s.panad = pd < 0 ? -Math.min(2032, (-pd << 8) / d2 | 0) : Math.min(2032, (pd << 8) / d2 | 0);
        break;
      }

     case 95:
      s.ptps = s8(d2);
      break;

     case 96:
      s.tund = s8(d2) << 2;
      break;

     case 97:
      s.vibhs = d2;
      s.vibcad = d3;
      if (s.vibcad < 64) {
        if (s.vibcad < 32) {
          s.vib_tc_ofst = 1;
          s.vibcad <<= 3;
        } else {
          s.vib_tc_ofst = 2;
          s.vibcad <<= 2;
        }
      } else if (s.vibcad < 128) {
        s.vib_tc_ofst = 4;
        s.vibcad <<= 1;
      } else if (s.vibcad !== 255) s.vib_tc_ofst = 8; else s.vib_tc_ofst = 16;
      s.vibcad &= 255;
      s.vibd = d4 << 8;
      s.vibdm = d4 << 8;
      break;

     case 98:
      s.vibcs = d2;
      s.vibad = s.vibdm / d2 >>> 0;
      break;

     case 99:
      s.rdms = d2;
      s.rdmd = (d3 << 8) + d4;
      s.rdmc = 0;
      s.rdmo = 0;
      break;

     case 101:
      s.swsk = 0;
      s.swshc = d2;
      s.swsc = d3;
      s.swss = d4 << 8;
      break;

     case 102:
      s.swshc = 0;
      s.swsc = d2;
      s.swsk = d2 ? 1 : 0;
      break;

     case 103:
      s.lp1 = s.p;
      s.lp1_cnt = 0;
      s.lp1_freq = 0;
      s.lp1_vol = 0;
      break;

     case 104:
      if (this.stop_jouchuu_se && !d2) {
        s.lp1_vol = 0;
        s.lp1_freq = 0;
        this.stop_jouchuu_se++;
      } else {
        s.lp1_cnt = s.lp1_cnt + 1 & 255;
        if (s.lp1_cnt !== d2 || s.lp1_cnt === 0) {
          s.lp1_vol += s8(d3);
          s.lp1_freq += s8(d4) * 8;
          s.p = s.lp1;
        } else {
          s.lp1_vol = 0;
          s.lp1_freq = 0;
        }
      }
      break;

     case 105:
      s.lp2 = s.p;
      s.lp2_cnt = 0;
      s.lp2_freq = 0;
      s.lp2_vol = 0;
      break;

     case 106:
      s.lp2_cnt = s.lp2_cnt + 1 & 255;
      if (s.lp2_cnt !== d2 || !s.lp2_cnt) {
        s.lp2_vol += s8(d3);
        s.lp2_freq += 8 * s8(d4);
        s.p = s.lp2;
      }
      break;

     case 107:
      s.lp3 = s.p;
      break;

     case 108:
      if (s.lp3 >= 0) s.p = s.lp3; else this.keyoffs |= this.keyd;
      break;

     case 109:
      s.kak1 = s.p;
      s.kakfg = 0;
      break;

     case 110:
      if (s.kakfg === 0) s.kakfg++; else if (s.kakfg === 1) {
        s.kakfg++;
        s.kak2 = s.p;
        s.p = s.kak1;
      } else {
        s.kakfg--;
        s.p = s.kak2;
      }
      break;

     case 114:
      s.rest_fg = 1;
      this.keyoff();
      s.ngs = d2;
      s.ngg = 0;
      s.vol = 0;
      s.ngc = s.ngs;
      s.ngo = 0;
      break;

     case 115:
      {
        s.rest_fg = 1;
        s.ngs = d2;
        s.ngg = d3;
        s.ngc = s.ngs;
        const t = s.ngg * s.ngc / 100 | 0;
        s.ngo = t || 1;
        break;
      }

     case 118:
      if (this.mt >= 13 && !this.se_playing[this.mt - 13].kind) this.eons |= 1 << this.mt;
      break;

     case 119:
      if (this.mt >= 13 && !this.se_playing[this.mt - 13].kind) this.eoffs |= 1 << this.mt;
      break;

     case 127:
      this.keyoffs |= this.keyd;
      break;
    }
  }
  tx_read() {
    const s = this.s, b = s.buf;
    for (let n = 0; n < 256; n++) {
      if (s.p + 3 >= b.length) return 1;
      const c = b[s.p + 3];
      if (!c) return 1;
      const d2 = b[s.p + 2], d3 = b[s.p + 1], d4 = b[s.p];
      s.p += 4;
      this.md = [ c, d2, d3, d4 ];
      if (c >= 128) {
        this.cmd(c - 128, d2, d3, d4);
        if (c === 242 || c === 243 || c === 255) {
          if (c === 255) return 1;
          return 0;
        }
      } else {
        if (s.ngg < 100 && d4) this.key_fg = 1;
        s.rest_fg = 0;
        this.note_set(c, d2, d3, d4);
        return 0;
      }
    }
    return 1;
  }
  note_set(c, d2, d3, d4) {
    const s = this.s;
    s.ngs = d2;
    s.ngg = d3;
    s.vol = d4 & 127;
    this.note_compute(c);
    s.ngc = s.ngs;
    s.ngo = s.ngg * s.ngc / 100 | 0 || 1;
  }
  note_compute(c) {
    const s = this.s, r = this.tr[this.mt];
    let x;
    if (c >= 72) {
      this.tone_set(c + 7 & 255);
      x = 36;
    } else x = c;
    x += s.ptps;
    x = (x << 8) + s.tund;
    x += s.lp1_freq + s.lp2_freq;
    while (x >= 24576) x -= 24576;
    const swp_ex = s.swpd;
    s.vibcc = 0;
    s.vibhc = 0;
    s.swpd = x;
    s.vib_tmp_cnt = 0;
    s.vib_tbl_cnt = 0;
    s.trehc = 0;
    s.trec = 0;
    s.vibd = 0;
    r.rr = s.rrd;
    r.env3_fg = 1;
    s.swpc = s.swsc;
    if (s.swpc) {
      s.swphc = s.swshc;
      if (!s.swsk) {
        const xx = s.swpd;
        if (s.swss >= 32513) s.swpd += 65536 - (s.swss & 65535); else s.swpd -= s.swss;
        this.swpadset(xx);
      } else {
        s.swpm = s.swpd;
        s.swpd = swp_ex;
      }
    }
    this.freq_set(s.swpd);
  }
  swpadset(xf) {
    const s = this.s;
    if (!s.swpc) return;
    const fd = Math.max(1, (s.swpc << 8) / Math.max(1, s.tmp) | 0);
    xf = xf < 0 ? 0 : xf >= 24576 ? 24575 : xf;
    s.swpm = xf;
    xf -= s.swpd;
    s.swpad = xf < 0 ? -(-xf / fd | 0) : xf / fd | 0;
  }
  vib_compute() {
    const s = this.s;
    s.vib_tbl_cnt = s.vib_tbl_cnt + s.vib_tc_ofst & 63;
    const t = VIBX[s.vib_tbl_cnt & 31];
    let v;
    if (s.vibd <= 32767) v = (s.vibd >> 7 & 254) * t >> 8; else v = ((s.vibd >> 8 & 127) + 2) * t >> 1;
    return s.vib_tbl_cnt >= 32 ? -v : v;
  }
  random() {
    const s = this.s;
    if (!s.rdms) return 0;
    s.rdmc += s.rdms;
    if (s.rdmc <= 256) return 0;
    s.rdmc &= 255;
    s.rdmo = s.rdmo + 1 & 127;
    return (RDM[s.rdmo + 1] << 8) + RDM[s.rdmo] & s.rdmd;
  }
  por_compute() {
    const s = this.s;
    let pf = s.swpm - s.swpd;
    if (pf === 0) {
      s.swpc = 0;
      return;
    }
    const neg = pf < 0;
    if (neg) pf = -pf;
    pf = (pf >> 8) * s.swsc + ((pf & 255) * s.swsc >> 8);
    if (!pf) pf = 1;
    s.swpd += neg ? -pf : pf;
  }
  keych() {
    const s = this.s, r = this.tr[this.mt];
    if (s.ngg < 100 && s.ngc === 1 && s.rrd >= 8) {
      r.rr = 7;
      r.env3_fg = 1;
    }
    if (s.ngo) {
      s.ngo--;
      if (!s.ngo) this.keyoff();
    }
    let set = 0, vib = 0;
    if (s.swpc) {
      if (s.swphc) s.swphc--; else {
        if (!s.swsk) {
          s.swpc--;
          if (!(s.swpc & 255)) s.swpd = s.swpm; else s.swpd += s.swpad;
        } else this.por_compute();
        set = 1;
      }
    }
    if (s.vibdm) {
      if (s.vibhc !== s.vibhs) s.vibhc = s.vibhc + 1 & 255; else {
        if (s.vibcc === s.vibcs) s.vibd = s.vibdm; else {
          s.vibd = s.vibcc ? s.vibd + s.vibad : s.vibad;
          s.vibcc++;
        }
        s.vib_tmp_cnt += s.vibcad;
        if (s.vib_tmp_cnt >= 256) {
          s.vib_tmp_cnt &= 255;
          vib = this.vib_compute();
          set = 1;
        }
      }
    }
    const rd = this.random();
    if (rd) {
      vib += rd;
      set = 1;
    }
    if (set) this.freq_set(s.swpd + vib);
  }
  note_cntl() {
    const s = this.s;
    if (s.vol && s.tred && s.trehs === s.trehc) {
      s.trec = s8(s.trec + (s.trecad * s8(s.tmpd) >> 8));
      const depth = s.trec < 0 ? s.tred * -s.trec : s.trec === 0 ? 1 : s.tred * s.trec;
      this.volxset(depth >> 8 & 255);
    }
    let set = 0, fd = s.swpd;
    if (s.swpc && !s.swphc) {
      set = 1;
      if (!s.swsk) s.swpd += s.swpad; else this.por_compute();
      fd = s.swpd;
    }
    if (s.vibd && s.vibhs === s.vibhc) {
      s.vib_tmp_cnt += s.vibcad;
      if (s.vib_tmp_cnt >= 256) {
        s.vib_tmp_cnt &= 255;
        fd += this.vib_compute();
        set = 1;
      }
    }
    const rd = this.random();
    if (rd) {
      set = 1;
      fd += rd;
    }
    if (set) this.freq_set(fd);
  }
  tempo_ch() {
    const s = this.s;
    if (s.tmpc) {
      if (! --s.tmpc) s.tmpw = (s.tmpm & 255) << 8; else s.tmpw += s.tmpad;
      s.tmp = s.tmpw >>> 8 & 255;
    }
  }
  bendch() {
    const s = this.s, b = s.buf;
    if (!s.swpc && b[s.p + 3] === 228) {
      s.swphc = b[s.p + 2];
      s.swpc = b[s.p + 1];
      let bf = b[s.p];
      s.p += 4;
      bf = (bf + s.ptps << 8) + s.tund;
      this.swpadset(bf);
    }
  }
  vol_compute() {
    const s = this.s;
    if (s.pvoc) {
      if (--s.pvoc === 0) s.pvod = s.pvom << 8; else s.pvod += s.pvoad;
    }
    if (s.vol) {
      let depth = 0;
      if (s.tred) {
        if (s.trehs === s.trehc) {
          s.trec = s8(s.trec + s.trecad);
          depth = s.trec < 0 ? s.tred * -s.trec : s.trec === 0 ? 1 : s.tred * s.trec;
        } else s.trehc++;
      }
      this.volxset(depth >> 8 & 255);
    }
    if (s.panc) {
      if (! --s.panc) s.pand = s.panm; else s.pand += s.panad;
      s.panf = s.pand >> 8;
    }
  }
  sound_sub() {
    const s = this.s;
    this.key_fg = 0;
    s.tmpd += s.tmp;
    if (this.mt < 13 && this.kaihi_time) {
      const f = this.kaihi_time >> 5;
      if (f < s.tmp) s.tmpd -= f;
    }
    if (s.tmpd >= 256) {
      s.tmpd &= 255;
      s.ngc = s.ngc - 1 & 255;
      if (s.ngc) this.keych(); else if (this.tx_read()) {
        this.keyoff();
        return 1;
      }
      this.tempo_ch();
      this.bendch();
      this.vol_compute();
    } else this.note_cntl();
    if (this.key_fg) this.keyon();
    return 0;
  }
  init_track(t) {
    const w = this.w[t];
    const b = w.buf, p = w.p;
    Object.assign(w, pistaNueva(), {
      buf: b,
      p: p
    });
  }
  sng_adrs_set(idx) {
    const d = this.sng;
    if (!d) return;
    const a = d[(idx & 15) * 4] | d[(idx & 15) * 4 + 1] << 8;
    this.song_end &= ~8191;
    for (let i = 0; i < 13; i++) {
      const a2 = d[a + i * 4] | d[a + i * 4 + 1] << 8 | d[a + i * 4 + 2] << 16;
      if (a2) {
        this.w[i].buf = d;
        this.w[i].p = a2;
        this.init_track(i);
      } else this.song_end |= 1 << i;
    }
    this.keyons &= ~8191;
  }
  sng_off() {
    for (let i = 0; i < 13; i++) {
      this.tr[i].rr = 7;
      this.tr[i].env3_fg = 1;
    }
    this.song_end |= 8191;
    this.keyoffs |= 8191;
  }
  fadeTiempo(c) {
    return {
      33554179: 655,
      33554180: 218,
      33554181: 131,
      33554182: 1310,
      33554183: 655,
      33554184: 218,
      33554185: 131,
      33554186: 1310,
      33554187: 655,
      33554188: 218,
      33554189: 131
    }[c] || 1;
  }
  codigo(c) {
    if (c >= 33554179 && c <= 33554181) {
      if (this.sng_play_code === -1) return;
      if (this.sng_status < 3) this.fadein_fg = c; else {
        this.fadein_time = this.fadeTiempo(c);
        this.fout_term = 0;
        this.fade_time.fill(0);
      }
      this.kaihi_fg = 0;
      this.kaihi_time = 0;
    } else if (c >= 33554182 && c <= 33554189) {
      const t = this.fadeTiempo(c);
      for (let i = 0; i < 13; i++) if (!(this.fout_term & 1 << i)) this.fade_time[i] = t;
      this.fadein_time = 0;
      if (c >= 33554186) this.sng_play_code = -1;
    } else if (c === 33554192) {
      this.fade_time[2] = this.fade_time[3] = 43;
      for (let i = 4; i < 13; i++) if (!(this.fout_term & 1 << i)) this.fade_time[i] = 81;
      this.fadein_time = 0;
      this.kaihi_fg = 1;
    } else if (c === 33554177) this.pausa = true; else if (c === 33554178) this.pausa = false; else if (c === 33554431) {
      this.sng_play_code = 0;
      this.sng_off();
    } else if (c === 4278190085) this.sound_mono_fg = 1; else if (c === 4278190086) this.sound_mono_fg = 0; else if (c === 4278190334) this.stop_jouchuu_se = 1; else if (c === 33554208) this.syukan = 1; else if (c === 33554209) this.syukan = 0; else if ((c & 4294967280) === 16777216 && c !== this.sng_play_code) {
      if (this.sng_play_code === -1) {
        this.fade_time.fill(0);
        this.fade_value.fill(0);
        this.master.fill(0);
        this.fout_term = 0;
      }
      this.sng_status = 2;
      this.sng_play_code = c;
      this.sng_off();
      this.kaihi_fg = 0;
      this.kaihi_time = 0;
    }
  }
  fadeInt() {
    if (this.sng_status < 3) return;
    if (this.fade_time.some(t => t)) {
      for (let i = 0; i < 13; i++) {
        if (!this.fade_time[i]) continue;
        this.fade_value[i] += this.fade_time[i];
        if (this.fade_value[i] >= 65536) {
          this.fout_term |= 1 << i;
          this.fade_value[i] = 65536;
          this.fade_time[i] = 0;
        }
        if (this.fout_term === 8191 && this.sng_play_code === -1) this.sng_status = 4;
      }
    } else {
      this.vox_on_vol = this.vox ? Math.min(24576, (this.vox_on_vol || 0) + 245) : Math.max(0, (this.vox_on_vol || 0) - 245);
      if (this.fadein_time) {
        let algo = 0;
        for (let i = 0; i < 13; i++) {
          this.fade_value[i] = this.fadein_time >= this.fade_value[i] ? 0 : this.fade_value[i] - this.fadein_time;
          algo |= this.fade_value[i];
        }
        if (!algo) this.fadein_time = 0;
      }
    }
    this.syukan_vol = this.syukan ? Math.min(20480, (this.syukan_vol || 0) + 204) : Math.max(0, (this.syukan_vol || 0) - 204);
    const vol3 = Math.max(this.vox_on_vol || 0, this.syukan_vol);
    for (let i = 0; i < 13; i++) this.master[i] = Math.max(0, 65536 - Math.max(this.fade_value[i], vol3));
  }
  sePlay(code, fuente = 0) {
    const id = code & 255;
    let def;
    if (id < 128) def = this.res[id]; else if (this.efx) {
      const o = (id - 128) * 16, e = this.efx;
      def = {
        pri: e[o],
        kind: e[o + 2],
        character: e[o + 3],
        pistas: []
      };
      for (let k = 0; k < e[o + 1]; k++) {
        const a = e[o + 4 + k * 4] | e[o + 5 + k * 4] << 8 | e[o + 6 + k * 4] << 16;
        def.pistas.push({
          buf: e,
          p: 2048 + a
        });
      }
    }
    if (!def) return;
    for (let i = 0; i < 8; i++) if (this.song_end >> 13 + i & 1) {
      this.se_playing[i].code = 0;
      this.se_playing[i].pri = 0;
      this.se_playing[i].character = 0;
    }
    let ch = def.character;
    def.pistas.forEach(pi => {
      let j = -1, prio = 256;
      for (let i = 0; i < 8; i++) {
        if ((this.se_playing[i].code & 255) === id && !this.se_request[i].code) {
          prio = 0;
          j = i;
          break;
        }
        if (def.pistas.length === 1 && (this.se_request[i].code & 255) === id) {
          prio = 0;
          j = i;
          break;
        }
        if (ch && (this.se_playing[i].character === ch || this.se_request[i].character === ch)) {
          prio = 0;
          j = i;
          break;
        }
      }
      if (j < 0) for (let i = 0; i < 8; i++) if (!this.se_playing[i].code && !this.se_request[i].code) {
        prio = 0;
        j = i;
        break;
      }
      if (j < 0) for (let i = 0; i < 8; i++) {
        const p = this.se_request[i].code ? this.se_request[i].pri : this.se_playing[i].pri;
        if (p <= prio) {
          prio = p;
          j = i;
        }
      }
      if (def.pri < prio || j < 0) return;
      const pi2 = Array.isArray(pi) ? {
        buf: Uint8Array.from(pi),
        p: 0
      } : pi;
      Object.assign(this.se_request[j], {
        pri: def.pri,
        kind: def.kind,
        character: ch,
        buf: pi2.buf,
        p: pi2.p,
        code: code,
        fuente: fuente
      });
      ch = 0;
    });
  }
  se_adrs_set(i) {
    const rq = this.se_request[i], pl = this.se_playing[i];
    Object.assign(pl, {
      code: rq.code,
      pri: rq.pri,
      kind: rq.kind,
      character: rq.character,
      buf: rq.buf,
      p: rq.p
    });
    rq.code = 0;
    rq.pri = 0;
    rq.character = 0;
    this.se_fuente[i] = rq.fuente || 0;
    rq.fuente = 0;
    if (this.se_fuente[i]) this.spu.port.postMessage({
      tipo: "canal",
      i: i,
      fuente: this.se_fuente[i]
    });
    const t = i + 13;
    this.w[t].buf = pl.buf;
    this.w[t].p = pl.p;
    this.init_track(t);
    this.se_vol[i] = 2 * (pl.code & 16128);
    this.song_end &= ~(1 << t);
    this.keyons &= ~(1 << t);
    this.se_pan[i] = (pl.code >> 16) + 32 & 63;
    this.keyoffs &= ~(1 << t);
  }
  se_off(i) {
    const t = i + 13;
    this.tr[t].env3_fg = 1;
    this.tr[t].rr = 0;
    this.song_end |= 1 << t;
    this.keyoffs |= 1 << t;
  }
  tick() {
    while (this.codigos.length) this.codigo(this.codigos.shift());
    if (this.sng_status === 2 && this.sng_play_code && this.sng_play_code !== -1) {
      this.sng_adrs_set(this.sng_play_code);
      if (this.fadein_fg) {
        this.fadein_time = this.fadeTiempo(this.fadein_fg);
        this.fade_value.fill(65536);
        this.fadein_fg = 0;
      } else {
        this.fade_value.fill(0);
        this.fade_time.fill(0);
        this.fadein_time = 0;
      }
      this.fout_term = 0;
      this.sng_status = 3;
    } else if (this.sng_status === 3) {
      this.fadeInt();
      if (this.kaihi_fg) {
        if (this.kaihi_time < 256) this.kaihi_time++;
      } else if (this.kaihi_time) this.kaihi_time = this.kaihi_time <= 16 ? 0 : this.kaihi_time - 16;
      for (this.mt = 0; this.mt < 13; this.mt++) this.pasoPista();
      if ((this.song_end & 8191) === 8191) this.sng_status = 4;
    } else if (this.sng_status === 4) {
      this.sng_off();
      this.sng_play_code = 0;
      this.sng_status = 2;
    }
    for (this.mt = 13; this.mt < 21; this.mt++) {
      const i = this.mt - 13;
      if (this.se_request[i].code) {
        this.se_off(i);
        this.se_adrs_set(i);
      } else this.pasoPista();
    }
    if (this.stop_jouchuu_se >= 2) this.stop_jouchuu_se = 0;
    this.spuwr();
  }
  pasoPista() {
    this.keyd = 1 << this.mt;
    if (this.song_end & this.keyd) return;
    const s = this.w[this.mt];
    if (!s.buf) {
      this.song_end |= this.keyd;
      return;
    }
    if (this.sound_sub()) {
      this.song_end |= this.keyd;
      s.buf = null;
    }
  }
  spuwr() {
    const v = this.spu.voces;
    for (let i = 0; i < 21; i++) if (this.keyoffs & 1 << i) v[i].keyOff();
    this.keyoffs = 0;
    for (let i = 0; i < 21; i++) {
      const r = this.tr[i], x = v[i];
      if (r.vol_fg) {
        x.volL = Math.min(16383, r.vol_l);
        x.volR = Math.min(16383, r.vol_r);
        r.vol_fg = 0;
      }
      if (r.pitch_fg) {
        x.pitch = r.pitch;
        r.pitch_fg = 0;
      }
      if (r.addr_fg) {
        x.start = r.addr;
        r.addr_fg = 0;
      }
      if (r.env1_fg) {
        x.amode = r.a_mode;
        x.ar = r.ar;
        x.dr = r.dr;
        x.sl = r.sl;
        r.env1_fg = 0;
      }
      if (r.env2_fg) {
        x.smode = r.s_mode;
        x.sr = r.sr;
        x.sl = r.sl;
        r.env2_fg = 0;
      }
      if (r.env3_fg) {
        x.rmode = r.r_mode;
        x.rr = r.rr;
        r.env3_fg = 0;
      }
    }
    for (let i = 0; i < 21; i++) if (this.keyons & 1 << i) v[i].keyOn();
    this.keyons = 0;
  }
}

class Reverb {
  constructor() {
    const t = [ 1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617 ].map(n => Math.round(n * .85));
    this.combs = t.map(n => ({
      b: new Float32Array(n),
      i: 0,
      f: 0
    }));
    this.aps = [ 556, 441, 341, 225 ].map(n => ({
      b: new Float32Array(n),
      i: 0
    }));
    this.fb = .8;
    this.damp = .35;
  }
  proc(x) {
    let o = 0;
    for (const c of this.combs) {
      const y = c.b[c.i];
      c.f = y * (1 - this.damp) + c.f * this.damp;
      c.b[c.i] = x + c.f * this.fb;
      if (++c.i >= c.b.length) c.i = 0;
      o += y;
    }
    for (const a of this.aps) {
      const y = a.b[a.i];
      a.b[a.i] = o + y * .5;
      if (++a.i >= a.b.length) a.i = 0;
      o = y - o;
    }
    return o * .03;
  }
}

class SPU extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ram = new Uint8Array(512 * 1024);
    this.voces = Array.from({
      length: 24
    }, () => new Voz(this));
    this.drv = new Driver(this);
    this.acum = 0;
    this.volMaster = 1;
    this.ganMusica = 1;
    this.revL = new Reverb;
    this.revR = new Reverb;
    this.revR.combs.forEach(c => {
      c.i = 23 % c.b.length;
    });
    this.prof = .5;
    this.port.onmessage = e => this.msg(e.data);
  }
  banco(buf) {
    const d = new Uint8Array(buf), be = o => (d[o] << 24 | d[o + 1] << 16 | d[o + 2] << 8 | d[o + 3]) >>> 0;
    const off = be(0), size = be(4);
    for (let k = 0; k < size / 16; k++) {
      const o = 16 + k * 16, idx = off / 16 + k;
      this.drv.voces[idx] = {
        addr: (d[o] | d[o + 1] << 8 | d[o + 2] << 16 | d[o + 3] << 24) >>> 0,
        note: s8(d[o + 4]),
        tune: s8(d[o + 5]),
        a_mode: d[o + 6],
        ar: d[o + 7],
        dr: d[o + 8],
        s_mode: d[o + 9],
        sr: d[o + 10],
        sl: d[o + 11],
        r_mode: d[o + 12],
        rr: d[o + 13],
        pan: d[o + 14],
        decl_vol: d[o + 15]
      };
    }
    const p = 16 + size, spu = be(p), n = be(p + 4);
    this.ram.set(d.subarray(p + 16, p + 16 + n), spu);
  }
  msg(m) {
    const d = this.drv;
    if (m.tipo === "banco") this.banco(m.buf); else if (m.tipo === "sng") {
      d.sng = new Uint8Array(m.buf);
    } else if (m.tipo === "efx") {
      d.efx = new Uint8Array(m.buf);
    } else if (m.tipo === "residente") {
      d.res = m.datos;
    } else if (m.tipo === "codigo") d.codigos.push(m.codigo >>> 0); else if (m.tipo === "vox") d.vox = !!m.on; else if (m.tipo === "se") d.sePlay(m.codigo >>> 0, m.fuente || 0); else if (m.tipo === "espacial") this.espacial = !!m.on; else if (m.tipo === "volumen") this.volMaster = m.v; else if (m.tipo === "estado") this.port.postMessage({
      sng: d.sng ? d.sng.length : 0,
      efx: d.efx ? d.efx.length : 0,
      status: d.sng_status,
      play: d.sng_play_code,
      song_end: d.song_end.toString(16),
      pausa: d.pausa,
      ganMusica: +this.ganMusica.toFixed(3),
      voces: this.voces.filter(v => v.on).length,
      instrumentos: d.voces.filter(Boolean).length,
      master: d.master.slice(0, 4),
      fade: d.fade_value.slice(0, 4)
    }); else if (m.tipo === "callar") {
      for (const v of this.voces) v.on = false;
      d.song_end = 2097151;
      d.sng_play_code = 0;
      d.sng_status = 2;
    }
  }
  process(_, out) {
    const L = out[0][0], R = out[0][1] || out[0][0];
    const esp = this.espacial && out.length > 8, F = this.drv.se_fuente;
    if (esp) for (let c = 1; c <= 8; c++) out[c][0].fill(0);
    for (let i = 0; i < L.length; i++) {
      if ((this.acum -= 1) <= 0) {
        this.acum += TICK;
        this.drv.tick();
      }
      this.ganMusica += ((this.drv.pausa ? 0 : 1) - this.ganMusica) * .003;
      let l = 0, r = 0, el = 0, er = 0;
      for (let k = 0; k < 21; k++) {
        const v = this.voces[k];
        if (!v.on) continue;
        const s = v.render();
        if (esp && k >= 13 && F[k - 13]) {
          out[k - 12][0][i] += s * (v.volL + v.volR) / 32768 / 32768 * this.volMaster;
          continue;
        }
        const gm = k < 13 ? this.ganMusica : 1, sl = s * v.volL / 16384 * gm, sr = s * v.volR / 16384 * gm;
        l += sl;
        r += sr;
        if (k < 13) {
          el += sl;
          er += sr;
        }
      }
      l += this.revL.proc(el) * this.prof * 2;
      r += this.revR.proc(er) * this.prof * 2;
      L[i] = Math.max(-1, Math.min(1, l / 32768 * this.volMaster));
      if (R !== L) R[i] = Math.max(-1, Math.min(1, r / 32768 * this.volMaster));
    }
    return true;
  }
}

registerProcessor("mgs-spu", SPU);
