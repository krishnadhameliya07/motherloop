// Edinburgh Postnatal Depression Scale (EPDS)
//
// Source: Cox, J.L., Holden, J.M., and Sagovsky, R. (1987).
// Detection of postnatal depression: Development of the 10-item
// Edinburgh Postnatal Depression Scale.
// British Journal of Psychiatry, 150, 782-786.
//
// The authors permit reproduction of the scale without further
// permission provided the authors, title and source are quoted
// in all reproduced copies (shown in the UI).
//
// Each option lists its score. Items 3 and 5-10 are reverse-scored,
// which is why their scores run 3 -> 0.

export const EPDS_CITATION =
  'Cox, J.L., Holden, J.M., and Sagovsky, R. (1987). Detection of postnatal depression: Development of the 10-item Edinburgh Postnatal Depression Scale. British Journal of Psychiatry, 150, 782–786.'

export const EPDS_QUESTIONS = [
  {
    text: 'I have been able to laugh and see the funny side of things',
    options: [
      { label: 'As much as I always could', score: 0 },
      { label: 'Not quite so much now', score: 1 },
      { label: 'Definitely not so much now', score: 2 },
      { label: 'Not at all', score: 3 },
    ],
  },
  {
    text: 'I have looked forward with enjoyment to things',
    options: [
      { label: 'As much as I ever did', score: 0 },
      { label: 'Rather less than I used to', score: 1 },
      { label: 'Definitely less than I used to', score: 2 },
      { label: 'Hardly at all', score: 3 },
    ],
  },
  {
    text: 'I have blamed myself unnecessarily when things went wrong',
    options: [
      { label: 'Yes, most of the time', score: 3 },
      { label: 'Yes, some of the time', score: 2 },
      { label: 'Not very often', score: 1 },
      { label: 'No, never', score: 0 },
    ],
  },
  {
    text: 'I have been anxious or worried for no good reason',
    options: [
      { label: 'No, not at all', score: 0 },
      { label: 'Hardly ever', score: 1 },
      { label: 'Yes, sometimes', score: 2 },
      { label: 'Yes, very often', score: 3 },
    ],
  },
  {
    text: 'I have felt scared or panicky for no very good reason',
    options: [
      { label: 'Yes, quite a lot', score: 3 },
      { label: 'Yes, sometimes', score: 2 },
      { label: 'No, not much', score: 1 },
      { label: 'No, not at all', score: 0 },
    ],
  },
  {
    text: 'Things have been getting on top of me',
    options: [
      {
        label: "Yes, most of the time I haven't been able to cope at all",
        score: 3,
      },
      {
        label: "Yes, sometimes I haven't been coping as well as usual",
        score: 2,
      },
      { label: 'No, most of the time I have coped quite well', score: 1 },
      { label: 'No, I have been coping as well as ever', score: 0 },
    ],
  },
  {
    text: 'I have been so unhappy that I have had difficulty sleeping',
    options: [
      { label: 'Yes, most of the time', score: 3 },
      { label: 'Yes, sometimes', score: 2 },
      { label: 'Not very often', score: 1 },
      { label: 'No, not at all', score: 0 },
    ],
  },
  {
    text: 'I have felt sad or miserable',
    options: [
      { label: 'Yes, most of the time', score: 3 },
      { label: 'Yes, quite often', score: 2 },
      { label: 'Not very often', score: 1 },
      { label: 'No, not at all', score: 0 },
    ],
  },
  {
    text: 'I have been so unhappy that I have been crying',
    options: [
      { label: 'Yes, most of the time', score: 3 },
      { label: 'Yes, quite often', score: 2 },
      { label: 'Only occasionally', score: 1 },
      { label: 'No, never', score: 0 },
    ],
  },
  {
    text: 'The thought of harming myself has occurred to me',
    options: [
      { label: 'Yes, quite often', score: 3 },
      { label: 'Sometimes', score: 2 },
      { label: 'Hardly ever', score: 1 },
      { label: 'Never', score: 0 },
    ],
  },
]

export const SELF_HARM_ITEM_INDEX = 9

// Result bands. Thresholds follow common EPDS practice:
// 10 or more = possible depression, 13 or more = probable depression.
// These describe the answers only; they are not a diagnosis.
export function interpretEpds(total, selfHarmScore) {
  let band

  if (total >= 13) {
    band = {
      level: 'high',
      title: 'Your answers suggest you may be experiencing postnatal depression',
      message:
        'Postnatal depression is common and treatable, and it is not your fault. Please share this result with your doctor, midwife or health visitor soon so they can support you.',
    }
  } else if (total >= 10) {
    band = {
      level: 'medium',
      title: 'Your answers suggest some signs of depression',
      message:
        'It would help to talk to your doctor, midwife or health visitor about how you have been feeling. Consider taking the check again in two weeks.',
    }
  } else {
    band = {
      level: 'low',
      title: 'Your answers do not suggest depression right now',
      message:
        'Keep looking after yourself and leaning on your support. If your feelings change, or something still feels wrong, talk to your doctor. You can repeat this check any time.',
    }
  }

  return {
    ...band,
    selfHarmFlag: selfHarmScore > 0,
  }
}
