import React from "react";
import MembershipClient from "./MembershipClient";
import { getPublicMembershipWindow } from "@/app/actions/publicWindow";

export default async function MembershipPage() {
  const state = await getPublicMembershipWindow();
  
  return (
    <MembershipClient 
      initialWindowOpen={state.open} 
      initialSpotsRemaining={state.spotsRemaining} 
    />
  );
}
