/* =========================================================
   Rangoli — art-basic.js
   SVG line-art pages, part 1 of 2.
   Every page returns markup placed inside a <g> that already
   carries the line colour. Shapes without class "ln" become
   colour-fillable regions.
   ========================================================= */

(function () {
  'use strict';

  const RG = (window.RG = window.RG || {});
  RG.pages = RG.pages || [];

  const C = 400;
  const r1 = (n) => Math.round(n * 10) / 10;

  const rot = (deg, m) => `<g transform="rotate(${deg} ${C} ${C})">${m}</g>`;
  const mir = (m) => `<g transform="translate(800 0) scale(-1 1)">${m}</g>`;

  const polar = (r, deg) => ({
    x: r1(C + Math.cos((deg * Math.PI) / 180) * r),
    y: r1(C + Math.sin((deg * Math.PI) / 180) * r)
  });

  function star(cx, cy, outer, inner, points = 5, offset = -90) {
    let d = '';
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = ((offset + (180 / points) * i) * Math.PI) / 180;
      d += `${i ? 'L' : 'M'}${r1(cx + Math.cos(a) * r)} ${r1(cy + Math.sin(a) * r)}`;
    }
    return `<path d="${d}Z"/>`;
  }

  function bloom(cx, cy, r, petals, offset = 0) {
    let out = '';
    for (let i = 0; i < petals; i++) {
      const a = offset + (i * 360) / petals;
      out += `<ellipse cx="${cx}" cy="${r1(cy - r * 0.52)}" rx="${r1(r * 0.34)}" ry="${r1(r * 0.46)}" transform="rotate(${r1(a)} ${cx} ${cy})"/>`;
    }
    out += `<circle cx="${cx}" cy="${cy}" r="${r1(r * 0.3)}"/>`;
    out += `<circle class="ln" cx="${cx}" cy="${cy}" r="${r1(r * 0.14)}"/>`;
    return out;
  }

  function cloud(cx, cy, s = 1) {
    return `<path d="M ${cx - 78 * s} ${cy}
      C ${cx - 88 * s} ${cy - 34 * s} ${cx - 46 * s} ${cy - 52 * s} ${cx - 22 * s} ${cy - 38 * s}
      C ${cx - 12 * s} ${cy - 72 * s} ${cx + 40 * s} ${cy - 70 * s} ${cx + 46 * s} ${cy - 34 * s}
      C ${cx + 82 * s} ${cy - 36 * s} ${cx + 90 * s} ${cy + 12 * s} ${cx + 54 * s} ${cy + 18 * s}
      L ${cx - 52 * s} ${cy + 18 * s}
      C ${cx - 84 * s} ${cy + 18 * s} ${cx - 90 * s} ${cy - 4 * s} ${cx - 78 * s} ${cy} Z"/>`;
  }

  RG.art = { r1, rot, mir, polar, star, bloom, cloud };

  function page(p) {
    RG.pages.push(p);
  }

  /* ------------------------------------------------------------------
     1. Butterfly Garden
  ------------------------------------------------------------------ */
  page({
    id: 'butterfly',
    title: 'Butterfly Garden',
    difficulty: 'Easy',
    category: 'Nature',
    svg() {
      const half = `
        <path class="ln" d="M 414 246 C 452 196 500 168 546 158"/>
        <circle class="ln" cx="546" cy="158" r="9"/>
        <path d="M 418 300 C 470 205 600 165 674 226 C 728 274 706 374 616 404 C 540 430 452 382 418 342 Z"/>
        <path d="M 452 318 C 502 252 590 220 640 256 C 676 282 666 344 604 368 C 552 388 486 360 452 318 Z"/>
        <circle cx="620" cy="288" r="30"/>
        <circle cx="556" cy="332" r="16"/>
        <path d="M 420 420 C 470 432 566 462 596 528 C 622 590 566 646 508 620 C 452 596 424 520 420 470 Z"/>
        <path d="M 452 472 C 486 486 540 510 556 546 C 570 578 542 604 512 590 C 480 576 458 522 452 472 Z"/>
        <circle cx="536" cy="568" r="16"/>
      `;
      return (
        half +
        mir(half) +
        `<ellipse cx="400" cy="428" rx="30" ry="146"/>
         <circle cx="400" cy="256" r="27"/>
         <path class="ln" d="M 400 300 L 400 552"/>
         <circle class="ln" cx="400" cy="348" r="5" fill="#2b2b33"/>
         <circle class="ln" cx="400" cy="404" r="5" fill="#2b2b33"/>
         <circle class="ln" cx="400" cy="460" r="5" fill="#2b2b33"/>
         <circle class="ln" cx="392" cy="246" r="4" fill="#2b2b33"/>
         <circle class="ln" cx="408" cy="246" r="4" fill="#2b2b33"/>`
      );
    }
  });

  /* ------------------------------------------------------------------
     2. Cozy Cat
  ------------------------------------------------------------------ */
  page({
    id: 'cat',
    title: 'Cozy Cat',
    difficulty: 'Easy',
    category: 'Animals',
    svg() {
      return `
        <path d="M 520 690 C 626 716 700 640 672 548 C 660 512 612 508 604 544 C 626 592 604 640 528 632 Z"/>
        <path d="M 316 386 C 240 470 220 616 250 704 Q 400 744 550 704 C 580 616 560 470 484 386 Z"/>
        <path d="M 292 250 L 258 132 L 372 186 Z"/>
        <path d="M 508 250 L 542 132 L 428 186 Z"/>
        <path d="M 300 234 L 284 172 L 350 200 Z"/>
        <path d="M 500 234 L 516 172 L 450 200 Z"/>
        <path d="M 400 172 C 486 172 548 236 548 314 C 548 398 482 454 400 454 C 318 454 252 398 252 314 C 252 236 314 172 400 172 Z"/>
        <path d="M 400 204 L 428 232 L 400 260 L 372 232 Z"/>
        <circle cx="352" cy="308" r="41"/>
        <circle cx="448" cy="308" r="41"/>
        <circle class="ln" cx="352" cy="308" r="15" fill="#2b2b33" stroke="none"/>
        <circle class="ln" cx="448" cy="308" r="15" fill="#2b2b33" stroke="none"/>
        <circle class="ln" cx="346" cy="301" r="5" fill="#ffffff" stroke="none"/>
        <circle class="ln" cx="442" cy="301" r="5" fill="#ffffff" stroke="none"/>
        <path d="M 388 352 L 412 352 L 400 372 Z"/>
        <path class="ln" d="M 400 372 L 400 388 M 400 388 C 388 402 372 400 366 390 M 400 388 C 412 402 428 400 434 390"/>
        <path class="ln" d="M 300 346 C 272 340 250 344 234 356 M 302 366 C 274 368 254 378 242 392 M 306 386 C 284 394 268 406 260 420"/>
        <path class="ln" d="M 500 346 C 528 340 550 344 566 356 M 498 366 C 526 368 546 378 558 392 M 494 386 C 516 394 532 406 540 420"/>
        <path class="ln" d="M 356 196 C 352 214 352 228 356 244 M 400 184 C 400 202 400 214 400 228 M 444 196 C 448 214 448 228 444 244"/>
        <ellipse cx="400" cy="602" rx="92" ry="108"/>
        <path d="M 400 560 C 380 534 344 546 344 576 C 344 602 400 634 400 634 C 400 634 456 602 456 576 C 456 546 420 534 400 560 Z"/>
        <ellipse cx="330" cy="716" rx="62" ry="32"/>
        <ellipse cx="470" cy="716" rx="62" ry="32"/>
        <path class="ln" d="M 310 702 L 310 732 M 330 698 L 330 736 M 350 702 L 350 732"/>
        <path class="ln" d="M 450 702 L 450 732 M 470 698 L 470 736 M 490 702 L 490 732"/>
        <path class="ln" d="M 596 566 C 612 594 616 620 606 646 M 626 556 C 646 588 650 616 638 644"/>
      `;
    }
  });

  /* ------------------------------------------------------------------
     3. Sky Balloon
  ------------------------------------------------------------------ */
  page({
    id: 'balloon',
    title: 'Sky Balloon',
    difficulty: 'Easy',
    category: 'Adventure',
    svg() {
      const body =
        'M 400 96 C 566 96 660 236 646 360 C 632 476 508 536 470 606 L 330 606 C 292 536 168 476 154 360 C 140 236 234 96 400 96 Z';
      const stripes = [
        [140, 87], [227, 87], [314, 86], [400, 86], [486, 87], [573, 87]
      ]
        .map(([x, w]) => `<rect x="${x}" y="80" width="${w}" height="560"/>`)
        .join('');
      return `
        <defs><clipPath id="balloonBody"><path d="${body}"/></clipPath></defs>
        <g clip-path="url(#balloonBody)">${stripes}</g>
        <path class="ln" d="${body}"/>
        <path class="ln" d="M 214 300 C 268 214 336 160 400 150"/>
        <path class="ln" d="M 586 300 C 532 214 464 160 400 150"/>
        <path class="ln" d="M 352 604 L 344 624 M 448 604 L 456 624 M 322 604 L 340 624 M 478 604 L 460 624"/>
        <path d="M 336 622 L 464 622 L 460 648 L 340 648 Z"/>
        <path d="M 344 648 L 456 648 L 442 728 L 358 728 Z"/>
        <path class="ln" d="M 348 674 L 452 674 M 352 700 L 448 700 M 380 648 L 376 726 M 400 648 L 400 728 M 420 648 L 424 726"/>
        <path d="M 348 622 L 340 620 L 330 620 L 336 622 Z"/>
        ${cloud(190, 690, 1)}
        ${cloud(650, 200, 0.85)}
        <path class="ln" d="M 700 620 C 712 606 726 606 738 620 M 740 648 C 752 634 766 634 778 648"/>
        <circle class="ln" cx="150" cy="160" r="6" fill="#2b2b33" stroke="none"/>
      `;
    }
  });

  /* ------------------------------------------------------------------
     4. Sweet Treat
  ------------------------------------------------------------------ */
  page({
    id: 'cupcake',
    title: 'Sweet Treat',
    difficulty: 'Easy',
    category: 'Food',
    svg() {
      const wrap =
        'M 264 474 L 536 474 L 492 700 Q 400 734 308 700 Z';
      let bands = '';
      const steps = 7;
      for (let i = 0; i < steps; i++) {
        const x1 = 264 + (272 / steps) * i;
        const x2 = 264 + (272 / steps) * (i + 1);
        bands += `<path d="M ${r1(x1)} 468 L ${r1(x2)} 468 L 400 806 Z"/>`;
      }
      return `
        <defs><clipPath id="cupWrap"><path d="${wrap}"/></clipPath></defs>
        <ellipse cx="400" cy="726" rx="178" ry="24"/>
        <g clip-path="url(#cupWrap)">${bands}</g>
        <path class="ln" d="${wrap}"/>
        <ellipse cx="400" cy="472" rx="148" ry="44"/>
        <ellipse cx="400" cy="418" rx="118" ry="41"/>
        <ellipse cx="400" cy="364" rx="88" ry="38"/>
        <ellipse cx="400" cy="316" rx="58" ry="33"/>
        <circle cx="400" cy="264" r="27"/>
        <path class="ln" d="M 400 238 C 414 218 436 210 452 214"/>
        <path class="ln" d="M 340 470 l 12 -10 M 400 486 l 14 -12 M 460 468 l 11 -9 M 320 414 l 12 -10 M 400 430 l 13 -11 M 470 410 l 11 -10 M 370 362 l 11 -9 M 430 356 l 12 -10 M 386 314 l 10 -9"/>
        <circle class="ln" cx="368" cy="452" r="7" fill="#ff7a59" stroke="none"/>
        <circle class="ln" cx="438" cy="440" r="6" fill="#6ee7a8" stroke="none"/>
        <circle class="ln" cx="424" cy="392" r="6" fill="#4cc9f0" stroke="none"/>
        <circle class="ln" cx="352" cy="382" r="5" fill="#ffd166" stroke="none"/>
        <circle class="ln" cx="452" cy="342" r="5" fill="#f472b6" stroke="none"/>
        <circle class="ln" cx="372" cy="332" r="5" fill="#a78bfa" stroke="none"/>
      `;
    }
  });

  /* ------------------------------------------------------------------
     5. Little Cottage
  ------------------------------------------------------------------ */
  page({
    id: 'cottage',
    title: 'Little Cottage',
    difficulty: 'Easy',
    category: 'Places',
    svg() {
      let rays = '';
      for (let i = 0; i < 12; i++) {
        const a = (i * 30 * Math.PI) / 180;
        rays += `<path class="ln" d="M ${r1(660 + Math.cos(a) * 64)} ${r1(138 + Math.sin(a) * 64)} L ${r1(660 + Math.cos(a) * 84)} ${r1(138 + Math.sin(a) * 84)}"/>`;
      }
      let fence = '';
      for (let i = 0; i < 6; i++) {
        const x = 40 + i * 30;
        fence += `<path class="ln" d="M ${x} 660 L ${x} 726"/>`;
      }
      return `
        <circle cx="660" cy="138" r="54"/>
        ${rays}
        <path d="M -10 556 C 120 500 260 560 400 540 C 540 520 680 470 810 516 L 810 810 L -10 810 Z"/>
        <path d="M -10 700 C 160 678 300 716 430 700 C 560 684 690 700 810 686 L 810 810 L -10 810 Z"/>
        <path d="M 378 692 L 344 810 L 480 810 L 430 692 Z"/>
        <path d="M 468 330 L 510 330 L 510 424 L 468 424 Z"/>
        <path d="M 262 432 L 538 432 L 538 692 L 262 692 Z"/>
        <path d="M 228 434 L 400 294 L 572 434 Z"/>
        <path class="ln" d="M 264 414 L 400 296 L 536 414 M 292 386 L 400 300 L 508 386 M 320 358 L 400 304 L 480 358"/>
        <path d="M 356 692 L 356 556 Q 400 524 444 556 L 444 692 Z"/>
        <circle class="ln" cx="428" cy="626" r="6" fill="#2b2b33" stroke="none"/>
        <rect x="292" y="476" width="58" height="62" rx="3"/>
        <rect x="450" y="476" width="58" height="62" rx="3"/>
        <path class="ln" d="M 321 478 L 321 536 M 294 507 L 348 507 M 479 478 L 479 536 M 452 507 L 506 507"/>
        <path class="ln" d="M 108 690 L 108 576 L 140 576 L 140 690"/>
        <circle cx="120" cy="516" r="58"/>
        <circle cx="176" cy="546" r="44"/>
        <circle cx="68" cy="552" r="40"/>
        <circle cx="646" cy="662" r="38"/>
        <circle cx="694" cy="672" r="30"/>
        <circle class="ln" cx="486" cy="292" r="14"/>
        <circle class="ln" cx="512" cy="258" r="18"/>
        <circle class="ln" cx="540" cy="216" r="22"/>
        ${fence}
        <path class="ln" d="M 34 686 L 208 686 M 34 706 L 208 706"/>
        ${cloud(180, 130, 0.9)}
        ${cloud(430, 96, 0.7)}
      `;
    }
  });

  /* ------------------------------------------------------------------
     6. Flower Bouquet
  ------------------------------------------------------------------ */
  page({
    id: 'bouquet',
    title: 'Flower Bouquet',
    difficulty: 'Medium',
    category: 'Nature',
    svg() {
      return `
        <path class="ln" stroke-width="6" d="M 400 604 C 396 512 398 430 400 340 M 400 590 C 360 520 330 470 300 420 M 400 590 C 440 520 470 470 500 426 M 400 580 C 392 500 386 470 372 440 M 400 580 C 412 502 424 470 438 442"/>
        <path d="M 338 520 C 300 486 288 528 316 552 C 342 574 360 544 338 520 Z"/>
        <path d="M 462 512 C 500 478 512 520 484 544 C 458 566 440 536 462 512 Z"/>
        <path d="M 356 566 C 330 546 320 578 342 594 C 362 608 376 586 356 566 Z"/>
        <path d="M 306 586 L 494 586 L 482 618 L 318 618 Z"/>
        <path d="M 318 618 L 482 618 L 506 762 Q 400 798 294 762 Z"/>
        <path class="ln" d="M 316 654 L 484 654 M 308 700 L 492 700"/>
        <path class="ln" d="M 360 622 C 352 680 358 730 372 782 M 440 622 C 448 680 442 730 428 782"/>
        ${bloom(400, 208, 84, 8)}
        ${bloom(278, 322, 62, 7, 12)}
        ${bloom(522, 330, 64, 7, 26)}
        ${bloom(360, 412, 44, 5, 8)}
        ${bloom(466, 420, 42, 6, 20)}
        <circle class="ln" cx="332" cy="250" r="9"/>
        <circle class="ln" cx="486" cy="248" r="7"/>
        <circle class="ln" cx="250" cy="398" r="8"/>
        <circle class="ln" cx="552" cy="414" r="6"/>
      `;
    }
  });
})();
