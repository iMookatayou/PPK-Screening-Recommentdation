'use client';

import { useEffect } from 'react';

// ตัวกรอง element ที่น่าจะเป็น overlay/modal
// - role="dialog" (มาตรฐาน a11y)
// - [data-overlay="true"] (เผื่อบางคอมโพเนนต์ไม่ได้ใส่ role)
// - class ชื่อแพร่หลายบางตัว (ปรับเพิ่มได้ตามโปรเจกต์)
const SELECTORS = [
  '[role="dialog"]',
  '[data-overlay="true"]',
  '.modal-backdrop',
  '.modal',
  '.dialog',
].join(',');

export default function AutoOverlayHost() {
  useEffect(() => {
    const overlayRoot =
      document.getElementById('overlay-root') ??
      (() => {
        const d = document.createElement('div');
        d.id = 'overlay-root';
        document.body.appendChild(d);
        return d;
      })();

    // ให้ root นี้อยู่สูงกว่า layout เสมอ
    overlayRoot.style.position = 'relative';
    overlayRoot.style.zIndex = '10000';

    const moved = new WeakSet<Element>();

    const lockScroll = () => {
      const hasOverlay = overlayRoot.querySelector('*') !== null;
      document.body.style.overflow = hasOverlay ? 'hidden' : '';
    };

    const moveIfOverlay = (el: Element) => {
      // ข้ามถ้าไม่ใช่เป้าหมาย หรือถูกย้ายแล้ว หรืออยู่ใต้ overlay-root อยู่แล้ว
      if (!(el instanceof HTMLElement)) return;
      if (!el.matches(SELECTORS)) return;
      if (moved.has(el)) return;
      if (overlayRoot.contains(el)) return;

      // ย้ายไปไว้ใต้ overlay-root
      overlayRoot.appendChild(el);
      moved.add(el);
      lockScroll();
    };

    // สแกนครั้งแรก (รองรับ overlay ที่แสดงก่อน observer รัน)
    document.querySelectorAll(SELECTORS).forEach(moveIfOverlay);
    lockScroll();

    // เฝ้าทั้งเอกสาร ถ้ามี overlay โผล่มา ให้ย้ายทันที
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            const el = n as Element;
            moveIfOverlay(el);
            // เผื่อมีลูกหลานที่เป็น overlay ซ้อนอยู่
            el.querySelectorAll?.(SELECTORS).forEach(moveIfOverlay);
          }
        });
        // ถ้า overlay ถูกลบ/ปิด ให้ปลดล็อกสกรอลล์
        if (m.removedNodes.length) lockScroll();
      }
    });

    mo.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      document.body.style.overflow = '';
    };
  }, []);

  return null;
}
