/* =========================================================
   Rangoli — art-detail.js
   SVG line-art pages, part 2 of 2.
   ========================================================= */

(function () {
  'use strict';

  const RG = window.RG;
  const { r1, rot, polar, star, bloom, cloud } = RG.art;

  function page(p) {
    RG.pages.push(p);
  }

  /* ------------------------------------------------------------------
     7. Ocean Friends
  ------------------------------------------------------------------ */
  page({
    id: 'fish',
    title: 'Ocean Friends',
    difficulty: 'Medium',
    category: 'Animals',
    svg() {
      const body =
        'M 604 400 C 560 314 430 280 330 336 C 262 372 232 400 232 400 C 232 400 262 428 330 464 C 430 520 560 486 604 400 Z';
      let scales = '';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const x = 404 + col * 52 + row * 22;
          const y = 354 + row * 46;
          scales += `<path class="ln" d="M ${x - 24} ${y} Q ${x} ${y + 30} ${x + 24} ${y}"/>`;
        }
      }
      return `
        <defs><clipPath id="fishBody"><path d="${body}"/></clipPath></defs>
        <path d="M 600 400 L 708 312 L 690 400 L 712 488 Z"/>
        <path d="M 418 306 C 438 250 502 240 534 292 Z"/>
        <path d="M 418 494 C 438 550 502 560 534 508 Z"/>
        <path d="${body}"/>
        <circle cx="338" cy="378" r="30"/>
        <circle class="ln" cx="338" cy="378" r="12" fill="#2b2b33" stroke="none"/>
        <circle class="ln" cx="331" cy="371" r="4" fill="#ffffff" stroke="none"/>
        <path class="ln" d="M 372 326 C 342 364 342 436 372 474"/>
        <path class="ln" d="M 244 394 C 264 384 282 386 298 396"/>
        <path class="ln" d="M 244 406 C 264 416 282 414 298 404"/>
        <g clip-path="url(#fishBody)">${scales}</g>
        <path d="M 96 720 C 74 662 118 630 96 578 C 84 548 106 524 128 536 C 112 566 130 594 138 622 C 148 660 132 696 124 720 Z"/>
        <path d="M 158 720 C 142 676 174 648 158 606 C 148 582 166 562 186 570 C 174 596 188 618 194 640 C 202 672 188 700 182 720 Z"/>
        <path class="ln" stroke-width="5" d="M 700 720 C 692 680 706 654 700 626 M 700 676 C 682 664 674 646 680 630 M 700 656 C 718 644 726 626 720 610"/>
        <path d="M -10 692 C 120 664 220 726 340 706 C 460 686 560 730 680 712 C 740 704 780 714 810 704 L 810 810 L -10 810 Z"/>
        ${star(664, 640, 46, 20, 5, -90)}
        <circle cx="246" cy="252" r="17"/>
        <circle cx="300" cy="196" r="11"/>
        <circle cx="212" cy="164" r="8"/>
        <circle cx="322" cy="128" r="6"/>
        <path class="ln" d="M 470 690 l 10 -12 M 510 700 l 12 -10 M 560 688 l 8 -12"/>
      `;
    }
  });

  /* ------------------------------------------------------------------
     8. Night Owl
  ------------------------------------------------------------------ */
  page({
    id: 'owl',
    title: 'Night Owl',
    difficulty: 'Medium',
    category: 'Animals',
    svg() {
      let feathers = '';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3 - row; col++) {
          const x = 352 + row * 24 + col * 48;
          const y = 512 + row * 40;
          feathers += `<path class="ln" d="M ${x - 22} ${y} Q ${x} ${y + 26} ${x + 22} ${y}"/>`;
        }
      }
      return `
        <path d="M 690 84 A 58 58 0 1 0 690 202 A 46 46 0 1 1 690 84 Z"/>
        ${star(212, 168, 18, 8, 5)}
        ${star(286, 104, 12, 5, 5)}
        ${star(120, 260, 10, 4, 5)}
        <path d="M 40 688 C 200 668 380 706 560 686 C 650 676 720 688 780 680 L 780 728 C 720 736 650 724 560 734 C 380 754 200 714 40 736 Z"/>
        <path d="M 150 760 C 118 738 108 776 138 792 C 166 808 180 782 150 760 Z"/>
        <path d="M 664 754 C 696 732 706 770 676 786 C 648 802 634 776 664 754 Z"/>
        <path d="M 300 218 L 258 130 L 360 176 Z"/>
        <path d="M 500 218 L 542 130 L 440 176 Z"/>
        <path d="M 400 196 C 520 196 584 316 574 462 C 564 596 496 664 400 664 C 304 664 236 596 226 462 C 216 316 280 196 400 196 Z"/>
        <path d="M 282 380 C 236 452 240 566 300 624 C 322 578 322 462 282 380 Z"/>
        <path d="M 518 380 C 564 452 560 566 500 624 C 478 578 478 462 518 380 Z"/>
        <circle cx="348" cy="330" r="80"/>
        <circle cx="452" cy="330" r="80"/>
        <circle cx="348" cy="330" r="34"/>
        <circle cx="452" cy="330" r="34"/>
        <circle class="ln" cx="348" cy="330" r="15" fill="#2b2b33" stroke="none"/>
        <circle class="ln" cx="452" cy="330" r="15" fill="#2b2b33" stroke="none"/>
        <circle class="ln" cx="341" cy="323" r="5" fill="#ffffff" stroke="none"/>
        <circle class="ln" cx="445" cy="323" r="5" fill="#ffffff" stroke="none"/>
        <path d="M 384 356 L 416 356 L 400 398 Z"/>
        <path class="ln" d="M 306 254 C 328 236 356 238 372 256 M 494 254 C 472 236 444 238 428 256"/>
        <path d="M 400 468 C 472 468 504 542 484 612 C 464 656 336 656 316 612 C 296 542 328 468 400 468 Z"/>
        ${feathers}
        <path d="M 366 656 C 356 674 360 690 372 696 L 384 696 C 388 682 384 666 376 656 Z"/>
        <path d="M 434 656 C 444 674 440 690 428 696 L 416 696 C 412 682 416 666 424 656 Z"/>
        <path class="ln" d="M 240 470 C 268 486 292 508 306 534 M 560 470 C 532 486 508 508 494 534"/>
      `;
    }
  });

  /* ------------------------------------------------------------------
     9. Mandala Bloom
  ------------------------------------------------------------------ */
  page({
    id: 'mandala',
    title: 'Mandala Bloom',
    difficulty: 'Hard',
    category: 'Patterns',
    svg() {
      let out = '';
      for (let i = 0; i < 24; i++) {
        out += rot(i * 15, `<path d="M 400 112 C 442 78 442 44 400 26 C 358 44 358 78 400 112 Z"/>`);
      }
      for (let i = 0; i < 24; i++) {
        const p = polar(384, i * 15 + 7.5);
        out += `<circle cx="${p.x}" cy="${p.y}" r="9"/>`;
      }
      for (let i = 0; i < 12; i++) {
        out += rot(i * 30, `<path d="M 400 292 C 440 250 440 176 400 132 C 360 176 360 250 400 292 Z"/>`);
      }
      for (let i = 0; i < 8; i++) {
        out += rot(i * 45, `<path d="M 400 366 C 428 340 428 320 400 296 C 372 320 372 340 400 366 Z"/>`);
      }
      out += `<circle cx="400" cy="400" r="34"/>`;
      out += `<circle class="ln" cx="400" cy="400" r="108"/>`;
      out += `<circle class="ln" cx="400" cy="400" r="278"/>`;
      out += `<circle class="ln" cx="400" cy="400" r="392"/>`;
      return out;
    }
  });

  /* ------------------------------------------------------------------
     10. Leafy Wreath
  ------------------------------------------------------------------ */
  page({
    id: 'wreath',
    title: 'Leafy Wreath',
    difficulty: 'Hard',
    category: 'Nature',
    svg() {
      let leaves = '';
      let berries = '';
      const N = 20;
      for (let i = 0; i < N; i++) {
        const deg = (i * 360) / N + 9;
        const p = polar(238, deg);
        leaves += `<ellipse cx="${p.x}" cy="${p.y}" rx="29" ry="56" transform="rotate(${r1(deg + 90)} ${p.x} ${p.y})"/>`;
      }
      for (let i = 0; i < 14; i++) {
        const deg = (i * 360) / 14 + 22;
        const p = polar(180, deg);
        leaves += `<ellipse cx="${p.x}" cy="${p.y}" rx="22" ry="42" transform="rotate(${r1(deg + 90)} ${p.x} ${p.y})"/>`;
      }
      for (let i = 0; i < 10; i++) {
        const p = polar(286, (i * 360) / 10 + 12);
        berries += `<circle cx="${p.x}" cy="${p.y}" r="13"/>`;
      }
      return `
        ${leaves}
        ${berries}
        <circle class="ln" cx="400" cy="400" r="140"/>
        <path d="M 400 700 C 336 648 262 668 280 718 C 296 762 364 744 400 712 Z"/>
        <path d="M 400 700 C 464 648 538 668 520 718 C 504 762 436 744 400 712 Z"/>
        <path d="M 384 722 C 362 754 348 782 352 808 L 382 776 Z"/>
        <path d="M 416 722 C 438 754 452 782 448 808 L 418 776 Z"/>
        <circle cx="400" cy="702" r="26"/>
      `;
    }
  });

  /* ------------------------------------------------------------------
     11. Kaleidoscope
  ------------------------------------------------------------------ */
  page({
    id: 'kaleidoscope',
    title: 'Kaleidoscope',
    difficulty: 'Hard',
    category: 'Patterns',
    svg() {
      const blade = (inner, outer, halfW) => {
        const y1 = 400 - inner;
        const y2 = 400 - outer;
        const ym = 400 - (inner + outer) / 2;
        return `M 400 ${r1(y1)} L ${r1(400 + halfW)} ${r1(ym)} L 400 ${r1(y2)} L ${r1(400 - halfW)} ${r1(ym)} Z`;
      };
      let out = '';
      for (let i = 0; i < 12; i++) out += rot(i * 30, `<path d="${blade(296, 380, 40)}"/>`);
      for (let i = 0; i < 12; i++) out += rot(i * 30 + 15, `<path d="${blade(194, 270, 40)}"/>`);
      for (let i = 0; i < 12; i++) out += rot(i * 30, `<path d="${blade(96, 178, 32)}"/>`);
      for (let i = 0; i < 12; i++) {
        const p = polar(136, i * 30 + 15);
        out += `<circle cx="${p.x}" cy="${p.y}" r="8"/>`;
      }
      out += `<circle cx="400" cy="400" r="86"/>`;
      out += `<circle cx="400" cy="400" r="42"/>`;
      out += `<circle class="ln" cx="400" cy="400" r="392"/>`;
      return out;
    }
  });
})();
