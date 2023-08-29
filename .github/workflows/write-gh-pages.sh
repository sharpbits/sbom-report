#!/bin/sh
set -e

# Clone gh-pages branch, push site update

REPO_AUTH="${GITHUB_ACTOR}:${GITHUB_TOKEN}"
REPO="https://${REPO_AUTH}@ghe.coxautoinc.com/${GITHUB_REPOSITORY}.git"

rm -rf .git # Need to remove to prevent git confusion

cd dist
cp ../public/*.json ./
touch .nojekyll

# /dist now contains all the files we want to commit to gh-pages branch

git init -b publish

git config user.name "${GITHUB_ACTOR}"
git config user.email "${GITHUB_ACTOR}@users.noreply.github.com"

git add .
git commit -m "Build action from ${GITHUB_SHA}"
git push --force $REPO publish:${TARGET_BRANCH}

# Cleanup
rm -fr .git
