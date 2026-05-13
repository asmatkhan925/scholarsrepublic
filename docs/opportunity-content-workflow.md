# Opportunity Content Workflow

This workflow keeps Scholars Republic scholarship data useful, accurate, and safe.

## 1. Back up before bulk work

Before migrations, imports, bulk edits, or publishing many opportunities, run:

    cd /home/scholarsrepublic/scholarsrepublic
    ./deploy/backup_production.sh

Confirm backup files exist and are non-empty.

## 2. Use drafts before publishing

Preferred workflow:

1. Create or import opportunity drafts.
2. Validate drafts in Django admin.
3. Import valid drafts as draft opportunities.
4. Review each opportunity manually.
5. Verify details from the official source.
6. Publish only after content is complete and verified.

Do not publish sample, placeholder, or unverified content.

## 3. Required public fields

Before publishing, each opportunity should have:

- Clear title
- Provider or university name
- Country or linked country reference
- Degree level or application track when relevant
- Funding type
- Deadline, or rolling deadline marked clearly
- Short description
- Full description
- Eligibility
- Benefits
- How to apply
- Required documents when available
- Official link
- Source name
- Source URL

Optional stipend or allowance fields:

- Fill `stipend_summary` only when the official source confirms the stipend, allowance, or monthly support amount.
- Leave `stipend_summary` blank if the stipend is not confirmed.
- Do not estimate, infer, or invent stipend amounts from general benefits text.

## 4. Verification rules

Set verified_status=true only after manually checking the official source.

Use verification_note for short notes such as:

- Official call page checked
- Deadline confirmed from official page
- Benefits confirmed from official page

Use last_verified_at if the admin/model workflow updates it.

## 5. Claims to avoid

Do not claim these unless the official source clearly supports the claim:

- guaranteed scholarship
- guaranteed admission
- no IELTS
- no application fee
- fully funded
- all programs eligible
- all Pakistani students eligible

Use cautious wording when rules vary by program.

## 6. Official sources

Prefer official sources:

- university scholarship pages
- official government scholarship pages
- embassy or commission pages
- official application portals

Avoid using random blogs as the main source.

If a blog is used for discovery, still verify against the official source before publishing.

## 7. Audit commands

After imports or edits, run:

    cd /home/scholarsrepublic/scholarsrepublic/backend
    source venv/bin/activate
    python manage.py audit_opportunity_references
    python manage.py audit_opportunity_content

The audit commands are dry-run by default.

Fix any published opportunity that has:

- missing official link
- missing source URL or source name
- weak or sample text
- missing eligibility
- missing benefits
- missing how to apply
- missing deadline without rolling deadline
- published but unverified
- suspicious official/source URLs
- duplicate title/provider/country combinations

## 8. Publishing checklist

Before setting status=published:

- Backup has been taken for bulk changes.
- Official source is open and checked.
- Deadline is current or rolling deadline is accurate.
- Funding claim is supported.
- Stipend or allowance summary is blank unless confirmed by the official source.
- Eligibility is clear.
- Benefits are clear.
- How-to-apply instructions are clear.
- Official link works.
- Source URL and source name are filled.
- verified_status=true only if manually verified.

## 9. After publishing

Run:

    python manage.py audit_opportunity_references
    python manage.py audit_opportunity_content

Then check the public page:

    curl -I https://scholarsrepublic.org/scholarships

Open the scholarship detail page in a browser and verify:

- title
- provider
- country
- deadline
- official link
- trust note
- eligibility
- benefits
- how to apply
