// FAST content: what happens in the body during a 36-hour fast.
// Phases replace the hour-by-hour spreadsheet, because the human data does
// not support hourly precision. Facts marked thin:true rest mostly on animal
// work; the app shows that next to the fact.
(function (root) {
  const PHASES = [
    {
      from: 0, to: 4, name: 'FED STATE',
      facts: [
        { t: 'Your last meal is being digested and absorbed. Blood glucose and insulin are up.' },
        { t: 'Insulin moves glucose into muscle and liver as glycogen and blocks the release of fat.' },
        { t: 'No reserves are being burned yet. The clock runs anyway.' }
      ],
      orders: [
        'Kitchen is closed. Water only from here on.',
        'Brush your teeth. Meal time is over.',
        'Fill a water bottle and keep it within reach.',
        'Nothing to do but stay out of the kitchen. Execute.'
      ]
    },
    {
      from: 4, to: 8, name: 'POST-ABSORPTIVE',
      facts: [
        { t: 'The gut has delivered its fuel. Glucose and insulin fall back toward baseline.' },
        { t: 'Glucagon rises and the liver releases stored glycogen to hold blood sugar steady.' },
        { t: 'With insulin dropping, fat cells begin to release fatty acids.' }
      ],
      orders: [
        'First hunger signal incoming. It is a habit, not an emergency.',
        'Black coffee or plain tea is authorized. Nothing with calories.',
        'Drink a full glass of water. Now.',
        'Stay busy. Idle hands find the fridge.'
      ]
    },
    {
      from: 8, to: 12, name: 'GLYCOGEN DRAWDOWN',
      facts: [
        { t: 'The liver is spending its glycogen, roughly 100 g after a normal meal.' },
        { t: 'It already builds most of its glucose from scratch: about 64% of liver glucose output over the first 22 hours comes from gluconeogenesis (Rothman 1991).' },
        { t: 'Fat oxidation climbs as glucose use falls.' }
      ],
      orders: [
        'Fatigue or brain fog is your body changing fuel. Keep moving.',
        'Water. Add a pinch of salt if your head feels heavy.',
        'Sparkling water fills the stomach. Use it.',
        'If you can sleep through this stretch, do it. Sleep counts.'
      ]
    },
    {
      from: 12, to: 18, name: 'METABOLIC SWITCH',
      facts: [
        { t: 'Fuel supply shifts from glucose to fatty acids and ketones. The switch falls between hour 12 and 36, depending on glycogen stores and activity (Anton 2018).' },
        { t: 'The liver turns fatty acids into ketones. Blood BHB typically rises from about 0.1 toward 0.5 mmol/L.' },
        { t: 'Ghrelin, the hunger hormone, peaks at your usual meal times and falls again without food (Natalucci 2005).' }
      ],
      orders: [
        'Hunger comes in waves. Every wave passes in 20 minutes. Outlast it.',
        'Sodium matters now. Salt in your water prevents the headache.',
        'Go for a walk. Easy pace. No heroics.',
        'Your usual meal time is a trigger, not a need. Hold the line.',
        'Green tea or black coffee. No milk. No sugar. No excuses.',
        'Half a day is behind you. That was the warm-up.'
      ]
    },
    {
      from: 18, to: 24, name: 'EARLY KETOSIS',
      facts: [
        { t: 'Ketones reach about 0.5 mmol/L, the usual threshold for nutritional ketosis. Individual range is wide.' },
        { t: 'The brain starts running on ketones alongside glucose.' },
        { t: 'Insulin keeps falling: about 35% below baseline after the first 24 hours in a fasting study.' }
      ],
      orders: [
        'Use the clear head. Do the work that needs focus.',
        'Keep the electrolytes coming. Water plus salt.',
        'You are not starving. You are hungry. There is a difference.',
        'Cold hands are normal. Put on a layer and carry on.',
        'Do not negotiate with the fridge. It has nothing to offer you.',
        'One full day is within reach. Close it out.'
      ]
    },
    {
      from: 24, to: 30, name: 'DEEP FAST',
      facts: [
        { t: 'Liver glycogen is nearly gone. From hour 22 to 36 about 82% of liver glucose output is newly built (Rothman 1991).' },
        { t: 'Fat is the main fuel. Resting metabolic rate does not fall in a fast this short.' },
        { t: 'Growth hormone pulses become larger and more frequent, which helps protect muscle protein (Hartman 1992).' }
      ],
      orders: [
        '24 hours down. Most people never get here. You are not most people.',
        'Water with a pinch of salt. Again.',
        'No hard training today. Walk, stretch, recover.',
        'Stand up slowly. Blood pressure runs lower when fasted.',
        'Rest is part of the mission. Take it.',
        'Twelve hours looked long yesterday. Now it is all that is left.'
      ]
    },
    {
      from: 30, to: 36, name: 'FINAL PUSH',
      facts: [
        { t: 'Ketones commonly reach 1 to 2 mmol/L and supply a growing share of the brain\'s energy.' },
        { t: 'Basal growth hormone was measured at about ten times baseline after 37.5 hours in one study.' },
        { t: 'Autophagy, the recycling of damaged cell parts, is strongly induced by fasting in animals. In humans the timing and size of the effect are not established.', thin: true },
        { t: 'The scale will show about 1 kg less. Most of that is water and glycogen.' }
      ],
      orders: [
        'The hard part is done. Do not quit on the home stretch.',
        'Dress warm. Feeling a chill is normal at this stage.',
        'Keep drinking. Water does not break the fast. Quitting does.',
        'Plan the refeed: small and simple. Write it down.',
        'Under two hours. You have sat through longer meetings.',
        'Last hour. Finish what you started.'
      ]
    }
  ];

  const COMPLETE = {
    facts: [
      'Liver glycogen is depleted and fat has been your main fuel for about a day.',
      'Ketones and growth hormone are elevated, insulin is low.',
      'Glycogen and water refill within a day or two of normal eating.'
    ],
    order: 'Break the fast with a small, simple meal. Eat slowly. The full meal can wait 30 minutes.'
  };

  const SOURCES = [
    'Anton et al. 2018, Obesity: Flipping the Metabolic Switch',
    'Rothman et al. 1991, Science: hepatic glycogenolysis and gluconeogenesis in fasting humans',
    'Natalucci et al. 2005, Eur J Endocrinol: 24-h ghrelin secretion in fasting subjects',
    'Hartman et al. 1992, J Clin Endocrinol Metab: growth hormone secretion during a two-day fast',
    'Kim et al. 2021, Endocrinol Metab: intermittent fasting and hormonal rhythms (review)',
    'Moser et al. 2021, Front Endocrinol: a single 36-hour fasting period',
    'Longo & Mattson 2014, Cell Metab: fasting, molecular mechanisms and clinical applications'
  ];

  root.FAST_CONTENT = { PHASES: PHASES, COMPLETE: COMPLETE, SOURCES: SOURCES };
})(typeof window !== 'undefined' ? window : globalThis);
