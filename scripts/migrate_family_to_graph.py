import json
from datetime import datetime, timezone
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "family.json"
TARGET = ROOT / "data" / "family_graph.json"


def clean_slug(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return slug or "unknown"


def safe_node_id(node: dict, path: list[int]) -> str:
    existing = node.get("id")
    if existing:
        return existing
    return "anon_" + "_".join(str(i) for i in path)


def union_id_for(partner_a: str, partner_b: str) -> str:
    a, b = sorted([partner_a, partner_b])
    return f"u_{a}__{b}"


def load_family() -> dict:
    return json.loads(SOURCE.read_text(encoding="utf-8-sig"))


def migrate(data: dict) -> dict:
    persons: dict[str, dict] = {}
    unions: dict[str, dict] = {}
    parent_child: list[dict] = []
    children_of_union: list[dict] = []
    branches: list[dict] = []

    # Helps create stable external spouse records when only a
    # spouse name exists.
    external_spouse_ids: dict[str, str] = {}

    def ensure_person(pid: str, payload: dict):
        if pid in persons:
            # Merge missing fields only to avoid overwriting richer records.
            for key, value in payload.items():
                if key not in persons[pid] and value is not None:
                    persons[pid][key] = value
        else:
            persons[pid] = payload

    def ensure_external_spouse(name: str, branch: str | None) -> str:
        key = f"{name.strip().lower()}|{branch or ''}"
        if key in external_spouse_ids:
            return external_spouse_ids[key]

        base = f"ext_spouse_{clean_slug(name)}"
        pid = base
        i = 2
        while pid in persons:
            pid = f"{base}_{i}"
            i += 1

        payload = {
            "id": pid,
            "name": name.strip() or "Unknown Spouse",
            "isExternal": True,
            "branch": branch,
        }
        ensure_person(pid, payload)
        external_spouse_ids[key] = pid
        return pid

    def ensure_union(person_id: str, partner_id: str, node: dict) -> str:
        uid = union_id_for(person_id, partner_id)
        if uid not in unions:
            unions[uid] = {
                "id": uid,
                "partners": sorted([person_id, partner_id]),
                "relationshipType": "marriage",
            }

        # Carry relationship metadata if present on the source person node.
        if node.get("marriagedate") and "marriedDate" not in unions[uid]:
            unions[uid]["marriedDate"] = node["marriagedate"]
        if node.get("marriageplace") and "marriedPlace" not in unions[uid]:
            unions[uid]["marriedPlace"] = node["marriageplace"]
        if node.get("spouse") and "displaySpouseName" not in unions[uid]:
            unions[uid]["displaySpouseName"] = node["spouse"]
        return uid

    def walk(
        node: dict,
        path: list[int],
        parent_person_id: str | None,
        branch_ctx: str | None,
    ):
        node_type = node.get("type")
        node_id = safe_node_id(node, path)

        # Capture branch metadata from top-level branch nodes.
        if node_type == "branch":
            branches.append(
                {
                    "id": node_id,
                    "name": node.get("name", ""),
                    "branch": node.get("branch", ""),
                    "subtitle": node.get("subtitle", ""),
                    "url": node.get("url", ""),
                }
            )
            branch_ctx = node.get("branch") or branch_ctx

        # Treat every non-root/non-branch node as a person entity.
        is_person = node_type not in {"root", "branch"}
        if is_person:
            person_payload = {k: v for k, v in node.items() if k != "children"}
            person_payload.setdefault("id", node_id)
            person_payload.setdefault(
                "branch", node.get("branch") or branch_ctx
            )
            person_payload.setdefault("_sourcePath", path)
            ensure_person(node_id, person_payload)

            if parent_person_id:
                parent_child.append(
                    {"parentId": parent_person_id, "childId": node_id}
                )

            partner_ids: list[str] = []
            if node.get("spouseId"):
                partner_ids.append(node["spouseId"])
            if node.get("spouse"):
                partner_ids.append(
                    ensure_external_spouse(
                        node["spouse"], node.get("branch") or branch_ctx
                    )
                )

            # De-duplicate while preserving order
            seen = set()
            normalized_partner_ids = []
            for pid in partner_ids:
                if pid not in seen and pid != node_id:
                    normalized_partner_ids.append(pid)
                    seen.add(pid)

            union_ids_for_this_parent = []
            for partner_id in normalized_partner_ids:
                # If spouseId points to a person that isn't
                # present yet, create a minimal placeholder.
                if partner_id not in persons:
                    ensure_person(
                        partner_id,
                        {
                            "id": partner_id,
                            "name": partner_id,
                            "isPlaceholder": True,
                        },
                    )
                union_ids_for_this_parent.append(
                    ensure_union(node_id, partner_id, node)
                )

            # Link children to unions when available (supports
            # current and future multiple-spouse model).
            children = node.get("children", []) or []
            for child_idx, child in enumerate(children):
                child_id = safe_node_id(child, [*path, child_idx])
                if union_ids_for_this_parent:
                    for uid in union_ids_for_this_parent:
                        children_of_union.append(
                            {
                                "unionId": uid,
                                "childId": child_id,
                                "sourceParentId": node_id,
                            }
                        )

        # Recurse
        for i, child in enumerate(node.get("children", []) or []):
            next_parent = node_id if is_person else parent_person_id
            walk(child, [*path, i], next_parent, branch_ctx)

    walk(data, [], None, None)

    # De-duplicate edges
    parent_child_unique = list(
        {(e["parentId"], e["childId"]): e for e in parent_child}.values()
    )
    children_of_union_unique = list(
        {
            (e["unionId"], e["childId"], e["sourceParentId"]): e
            for e in children_of_union
        }.values()
    )

    return {
        "meta": {
            "sourceFile": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "model": "family-graph-v1",
            "notes": [
                "Persons are globally unique nodes.",
                "Unions capture spouse/partner relationships"
                " and marriage metadata.",
                "Parent-child and children-of-union edges"
                " are both retained for flexibility.",
            ],
        },
        "branches": branches,
        "persons": sorted(persons.values(), key=lambda p: p["id"]),
        "unions": sorted(unions.values(), key=lambda u: u["id"]),
        "parentChild": sorted(
            parent_child_unique,
            key=lambda e: (e["parentId"], e["childId"]),
        ),
        "childrenOfUnion": sorted(
            children_of_union_unique,
            key=lambda e: (e["unionId"], e["childId"], e["sourceParentId"]),
        ),
    }


def main() -> None:
    source = load_family()
    graph = migrate(source)
    TARGET.write_text(
        json.dumps(graph, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote graph file: {TARGET}")
    print(f"Persons: {len(graph['persons'])}")
    print(f"Unions: {len(graph['unions'])}")
    print(f"Parent-child edges: {len(graph['parentChild'])}")
    print(f"Children-of-union edges: {len(graph['childrenOfUnion'])}")


if __name__ == "__main__":
    main()
