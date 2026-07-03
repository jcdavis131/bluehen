import colorsys

CANVAS = "#0b0d0a"


def rel_lum(h):
    h = h.lstrip("#")
    def chan(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = h[0:2], h[2:4], h[4:6]
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def contrast(fg, bg):
    l1, l2 = rel_lum(fg), rel_lum(bg)
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)


def hls_to_hex(H, L, S):
    r, g, b = colorsys.hls_to_rgb(H, L, S)
    return "#{:02x}{:02x}{:02x}".format(round(r * 255), round(g * 255), round(b * 255))


def hex_to_hls(h):
    h = h.lstrip("#")
    r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
    return colorsys.rgb_to_hls(r, g, b)


# hen-blue original: #4a7c9b. H=203deg, S=0.354, L=0.449
# Desaturated to #4e7b97 at S=0.318, L=0.449 -> 4.28:1 (fail)
# Need to raise L until contrast >= 4.5
H, L, S = hex_to_hls("#4a7c9b")
new_S = S * 0.90  # 10% desat
print(f"hen-blue: H={H*360:.1f} orig_S={S:.3f} target_S={new_S:.3f}")
for L_try in [0.46, 0.47, 0.48, 0.49, 0.50, 0.51, 0.52]:
    hex_v = hls_to_hex(H, L_try, new_S)
    r = contrast(hex_v, CANVAS)
    print(f"  L={L_try:.2f} -> {hex_v}  {r:.2f}:1  {'PASS' if r>=4.5 else 'FAIL'}")

print()
# Also check slate-blue which was 4.78 — close to threshold, fine. But let me verify it stays.
print("slate-blue #6d7f98:", f"{contrast('#6d7f98', CANVAS):.2f}:1")
