import React from 'react';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import { mote } from '../theme/tokens';

// Drift's mascot. See DESIGN.md section 5 for where and when to use it.
// Animation (float, rings, glow) is done by the caller, not in here.

export type MoteState = 'rest' | 'listening' | 'glow' | 'asleep';

type Props = {
  state?: MoteState;
  size?: number;
  /** Omit for decorative use. Screen readers will skip it. */
  label?: string;
  /** 'flat' is the approved default. */
  mouth?: 'flat' | 'soft';
};

const BODY =
  'M-36 -30C-22 -40 6 -42 26 -36C34 -40 46 -40 54 -44C50 -34 46 -30 42 -24C48 -6 44 20 36 32C24 46 -12 48 -30 40C-44 32 -48 8 -46 -8C-46 -18 -42 -26 -36 -30Z';

export function Mote({ state = 'rest', size = 120, label, mouth = 'flat' }: Props) {
  const asleep = state === 'asleep';
  const glow = state === 'glow';
  const listening = state === 'listening';
  const dim = asleep ? 0.4 : 1;

  const eyes = glow ? (
    <>
      <Path d="M-21 -2Q-15 -11 -9 -2" fill="none" stroke={mote.face} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M9 -2Q15 -11 21 -2" fill="none" stroke={mote.face} strokeWidth={3.5} strokeLinecap="round" />
    </>
  ) : asleep ? (
    <>
      <Path d="M-21 -6Q-15 0 -9 -6" fill="none" stroke={mote.face} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M9 -6Q15 0 21 -6" fill="none" stroke={mote.face} strokeWidth={3.5} strokeLinecap="round" />
    </>
  ) : (
    <>
      <Ellipse cx={-15} cy={-4} rx={listening ? 6.2 : 5.5} ry={listening ? 5.8 : 4.5} fill={mote.face} />
      <Ellipse cx={15} cy={-4} rx={listening ? 6.2 : 5.5} ry={listening ? 5.8 : 4.5} fill={mote.face} />
    </>
  );

  return (
    <Svg
      width={size}
      height={size}
      viewBox="-100 -100 200 200"
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      {listening && (
        <>
          <Circle cx={0} cy={2} r={64} stroke={mote.trail} strokeWidth={1.5} fill="none" opacity={0.5} />
          <Circle cx={0} cy={2} r={78} stroke={mote.trail} strokeWidth={1.5} fill="none" opacity={0.28} />
        </>
      )}
      <Path d={BODY} fill={mote.body} />
      {eyes}
      {mouth === 'flat' ? (
        <Line x1={-19} y1={18} x2={19} y2={18} stroke={mote.face} strokeWidth={4} strokeLinecap="round" />
      ) : (
        <Path d="M-19 17Q0 24 19 17" fill="none" stroke={mote.face} strokeWidth={4} strokeLinecap="round" />
      )}
      {glow && <Circle cx={71} cy={-65} r={19} fill={mote.glow} opacity={0.3} />}
      <Circle cx={71} cy={-65} r={glow ? 10 : 9} fill={mote.glow} opacity={dim} />
      <Circle cx={90} cy={-80} r={5} fill={glow ? mote.glow : mote.trail} opacity={dim} />
    </Svg>
  );
}
