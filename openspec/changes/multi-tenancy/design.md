## Context

See proposal.md — Why.

The domain model is a chain: a namespace holds projects, a project holds services, and a service holds
deployments. Every level already removes its children in a cascade, except the namespace, which refuses the
removal while it still holds projects.

The change `source-control-providers` introduces a decorator and a guard of the role, and it applies them to
the write routes of the providers only. This change makes that guard general.

## Goals / Non-Goals

**Goals:**

- Two teams share one installation, and neither sees the resources of the other.
- An administrator sees everything, and manages the users.
- The history of a deployment answers who started it.

**Non-Goals:**

- A team, and a resource that several users share. The owner is one user. A group is a later change, and
  the ownership at the namespace is the level where it will attach.
- A public sign-up. An administrator makes a user. The roadmap names a sign-up as an option, and this change
  does not take it.
- A permission finer than the two roles. `admin` and `user` stay the whole set.
- A record of the actions of a user, beyond the deployment that they trigger.

## Decisions

**1. The owner lives on the namespace, and the chain gives it to everything below.**

A project belongs to a namespace, a service to a project, a deployment to a service. One column on the
namespace therefore answers the ownership of every resource, and a read of a service joins up the chain.

**Alternative that the change does not take:** an owner on each of the four tables. Every read then needs no
join, and every write must keep the four in agreement, which no constraint of the database can enforce.

**2. A resource of another user answers `404`, and not `403`.**

A refusal tells the caller that the resource exists. The identifiers are UUIDs, so a `404` gives away
nothing. This is the rule that the capability `projects` already applies when a project belongs to another
namespace, and this change extends it.

**3. An administrator passes every limit of the ownership.**

An administrator holds the installation. A rule that hid a resource from them would leave a server that
nobody can repair. The limit of the ownership therefore reads: the user sees what they own, and an
administrator sees everything.

**4. `triggeredBy` becomes a reference to a user, and it can be empty.**

An automatic deployment has no user. The change `deploy-developer-experience` adds a trigger from a webhook,
which no user starts. The column therefore allows an empty value, and the screen says "automatic" for it.

**5. The migration gives every resource that exists to one owner, whom the operator names.**

There is no evidence in the database of who made what. The platform cannot guess, and a wrong guess hides a
resource from the person who made it. The operator names the owner, the migration fills every row, and the
release notes state that the choice needs a manual correction afterwards.

**Alternative that the change does not take:** an owner that can be empty, which every user sees. It makes
the upgrade silent, and it leaves a class of resource that the rule of the ownership does not cover, for as
long as the installation lives.

## Risks / Trade-offs

**The change is breaking, and it is quiet.** A user who signs in after the upgrade sees fewer resources, and
nothing tells them why. → The release notes lead with it, and the migration names one owner instead of
guessing per row.

**Every read gains a join.** The list of the services of a project now joins up to the namespace. → The
tables are small, and each already carries its foreign key. If a read becomes slow, the answer is an index
on the owner of the namespace, and not a copy of the owner onto each table.

**A missed read leaks a resource.** The limit lives in each repository, and one query that forgets it shows
another user's data. → A specification covers each list and each read with a user who does not own the
resource. The capability `architecture-analyst` compares the code against these requirements, which is the
duty that the adoption of OpenSpec gave it.

**The guard of the role becomes general.** Every endpoint now reads the role, and a mistake locks out a user
who could work before. → The role restricts only what the specifications name: the management of the users,
and the write routes of the providers. Every other endpoint keeps its rule, and the limit of the ownership
does the work.

## Migration Plan

1. The migration adds the owner to the namespaces, and it allows an empty value.
2. The operator names the owner of everything that exists. The migration fills every row with that user.
3. The migration sets the column to hold a value always.
4. The second migration changes `triggeredBy` into a reference to a user, and it leaves the rows of today
   empty, which the screen reads as "automatic".
5. A rollback removes the two columns. Every user sees everything again, as before.

An installation that runs with one user needs no manual correction. An installation that runs with several
needs the administrator to move the resources afterwards, and the platform gives no operation for that
today. `tasks.md` carries an item that decides whether this change adds one.
