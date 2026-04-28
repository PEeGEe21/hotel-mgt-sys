'use client';

import { dashboardWidgets } from './widgets';

export const widgetRegistry = Object.entries(dashboardWidgets).reduce<
  Record<string, { component: (props: any) => JSX.Element }>
>((acc, [id, component]) => {
  acc[id] = { component };
  return acc;
}, {});
