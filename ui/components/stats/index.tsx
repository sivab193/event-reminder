"use client";

import { useState, useEffect } from "react";
import { Users, Eye, BarChart3, Cake } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc, increment } from "firebase/firestore";

export function Stats() {
    const [statsData, setStatsData] = useState({
        users: 0,
        birthdaysTracked: 0,
        visits: 0,
        loading: true,
        isOffline: false
    });

    useEffect(() => {
        const countersRef = doc(db, "stats", "counters");

        // Increment visits on mount, but only if they haven't visited before (unique)
        (async () => {
            const hasVisited = localStorage.getItem("hasVisited");
            if (!hasVisited) {
                try {
                    await updateDoc(countersRef, { visits: increment(1) });
                    localStorage.setItem("hasVisited", "true");
                } catch {
                    // Document might not exist yet — create it
                    try {
                        await setDoc(countersRef, { users: 0, birthdaysTracked: 0, visits: 1 }, { merge: true });
                        localStorage.setItem("hasVisited", "true");
                    } catch (e) {
                        // Silently ignore if permissions prevent writes
                    }
                }
            }
        })();

        // Listen to counters in real-time
        const unsubscribe = onSnapshot(countersRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setStatsData(prev => ({
                    ...prev,
                    users: data.users || 0,
                    birthdaysTracked: data.birthdaysTracked || 0,
                    visits: data.visits || 0,
                    loading: false
                }));
            } else {
                setStatsData(s => ({ ...s, loading: false }));
            }
        }, (error) => {
            console.error("Error listening to stats:", error);
            setStatsData(s => ({ ...s, loading: false, isOffline: true }));
        });

        return () => unsubscribe();
    }, []);

    const { users, birthdaysTracked, visits, loading, isOffline } = statsData;

    if (isOffline) return null;
    const avgBirthdays = users > 0 ? (birthdaysTracked / users).toFixed(1) : "0";

    const formatNumber = (num: number | null | undefined) => {
        if (num === null || typeof num === "undefined") return null;
        return Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 1
        }).format(num);
    };

    const stats = [
        {
            label: "Registered Users",
            value: loading ? null : formatNumber(users),
            icon: <Users className="w-5 h-5 lg:w-4 lg:h-4 text-primary" />,
        },
        {
            label: "Birthdays Tracked",
            value: loading ? null : formatNumber(birthdaysTracked),
            icon: <Cake className="w-5 h-5 lg:w-4 lg:h-4 text-primary" />,
        },
        {
            label: "Total Site Visits",
            value: loading ? null : formatNumber(visits),
            icon: <Eye className="w-5 h-5 lg:w-4 lg:h-4 text-primary" />,
        },
        {
            label: "Birthdays per User",
            value: loading ? null : avgBirthdays,
            icon: <BarChart3 className="w-5 h-5 lg:w-4 lg:h-4 text-primary" />,
        }
    ];

    return (
        <section className="w-full py-2 lg:py-2 mt-auto shrink-0 mb-16">
            <div className="container mx-auto px-1 sm:px-8">
                <div className="grid grid-cols-4 gap-2 sm:gap-6 lg:flex lg:flex-row lg:justify-around lg:items-center w-full">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="flex flex-col items-center justify-center text-center group">
                            <div className="flex flex-col lg:flex-row items-center gap-1 sm:gap-2 mb-1">
                                <div className="p-1 sm:p-2 lg:p-1.5 rounded-full bg-primary/10 text-primary">
                                    {stat.icon}
                                </div>
                                {loading ? (
                                    <div className="animate-pulse bg-muted h-5 sm:h-6 w-12 rounded"></div>
                                ) : (
                                    <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                        {stat.value}
                                    </span>
                                )}
                            </div>
                            <p className="text-muted-foreground text-[8px] sm:text-xs font-bold uppercase tracking-wider leading-tight max-w-[80%] mx-auto lg:max-w-none">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
