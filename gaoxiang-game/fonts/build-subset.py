"""生成 Impact 子集 WOFF2：仅保留项目实际用到的字符，减小体积。

用法：在本目录执行  python build-subset.py
源字体取自本机 Windows 字体目录 C:\\Windows\\Fonts\\impact.ttf
"""
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

CHARS = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    " .,:;!?()[]/%+-*&@#|_'\u00d7\u00b7"
    "\u25bc\u25b2\u2192\u2605\u25c6\u25a0\u25cf\u25cb"
)

SOURCES = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "Impact.ttf"),
    r"C:\Windows\Fonts\impact.ttf",
    "/Library/Fonts/Impact.ttf",
    "/System/Library/Fonts/Supplemental/Impact.ttf",
]

src = next((p for p in SOURCES if os.path.isfile(p)), None)
if not src:
    sys.exit("找不到 Impact 源字体，请把 Impact.ttf 放到本目录后重试")

font = TTFont(src)
opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = []
opts.hinting = False
opts.desubroutinize = True
opts.name_IDs = ["*"]
opts.notdef_outline = True

subsetter = subset.Subsetter(options=opts)
subsetter.populate(text=CHARS)
subsetter.subset(font)

font.flavor = "woff2"
font.save("Impact.woff2")
print("source:", src)
print("subset woff2 written")

# 回读校验
check = TTFont("Impact.woff2")
names = {n.nameID: str(n) for n in check["name"].names if n.platformID == 3}
print("family:", names.get(1), "| full:", names.get(4))
print("glyphs:", len(check.getGlyphOrder()))
print("size:", os.path.getsize("Impact.woff2"), "bytes")
