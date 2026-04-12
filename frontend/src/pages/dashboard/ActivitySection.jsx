/**
 * ActivitySection — lazy-loaded activity table.
 */
import React from 'react';
import ActivityTable from '../../components/ActivityTable';

export default function ActivitySection({ activities }) {
  return <ActivityTable activities={activities} />;
}
