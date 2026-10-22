"""Build dashboard association rules from the DataCo shipment CSV."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from mlxtend.frequent_patterns import association_rules, fpgrowth


MIN_SUPPORT = 0.003
MIN_CONFIDENCE = 0.60


def build_rules(csv_path: Path, output_path: Path) -> None:
    columns = [
        "Delivery Status",
        "Shipping Mode",
        "Order Region",
        "Category Name",
        "Customer Segment",
        "order date (DateOrders)",
    ]
    frame = pd.read_csv(
        csv_path, usecols=columns, low_memory=False, encoding="latin-1"
    )
    frame["Delayed"] = frame["Delivery Status"].str.lower().eq("late delivery")
    frame["Order Month"] = pd.to_datetime(
        frame["order date (DateOrders)"], errors="coerce"
    ).dt.to_period("M").astype("string")
    frame["Order Month"] = frame["Order Month"].fillna("Unknown")

    feature_columns = {
        "Shipping mode": "Shipping Mode",
        "Region": "Order Region",
        "Product category": "Category Name",
        "Customer segment": "Customer Segment",
        "Order month": "Order Month",
    }
    transactions = pd.concat(
        [
            pd.get_dummies(
                frame[column].fillna("Unknown").map(
                    lambda value: f"{label}={value}"
                )
            )
            for label, column in feature_columns.items()
        ],
        axis=1,
    )
    transactions["Outcome=Delayed"] = frame["Delayed"].values
    encoded = transactions.astype(bool)

    itemsets = fpgrowth(encoded, min_support=MIN_SUPPORT, use_colnames=True)
    all_rules = association_rules(
        itemsets,
        metric="confidence",
        min_threshold=0.0,
        num_itemsets=len(encoded),
    )
    delayed_all = all_rules[
        all_rules["consequents"].apply(
            lambda values: values == frozenset({"Outcome=Delayed"})
        )
    ]
    conf = dict(zip(delayed_all["antecedents"], delayed_all["confidence"]))

    def adds_value(antecedent, confidence, margin=0.02):
        parents = [c for a, c in conf.items() if a < antecedent]
        return not parents or confidence >= max(parents) + margin

    delayed_rules = delayed_all[
        (delayed_all["confidence"] >= MIN_CONFIDENCE)
        & (delayed_all["antecedents"].apply(len) >= 2)
        & delayed_all.apply(
            lambda row: adds_value(row["antecedents"], row["confidence"]), axis=1
        )
    ].sort_values(["lift", "confidence", "support"], ascending=False)

    exported = []
    for _, rule in delayed_rules.head(100).iterrows():
        exported.append(
            {
                "tags": sorted(
                    tag for tag in rule["antecedents"] if tag != "Outcome=Delayed"
                ),
                "support": float(rule["support"]),
                "confidence": float(rule["confidence"]),
                "lift": float(rule["lift"]),
                "count": int(round(rule["support"] * len(encoded))),
            }
        )

    payload = {
        "generatedFrom": csv_path.name,
        "transactions": len(encoded),
        "minSupport": MIN_SUPPORT,
        "minConfidence": MIN_CONFIDENCE,
        "rules": exported,
    }
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv", type=Path, nargs="?", default=Path("shipments.csv"))
    parser.add_argument(
        "--output", type=Path, default=Path("association-rules.json")
    )
    args = parser.parse_args()
    build_rules(args.csv, args.output)
