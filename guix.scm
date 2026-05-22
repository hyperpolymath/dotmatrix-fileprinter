; SPDX-License-Identifier: MPL-2.0
;; guix.scm — GNU Guix package definition for dotmatrix-fileprinter
;; Usage: guix shell -f guix.scm

(use-modules (guix packages)
             (guix build-system gnu)
             (guix licenses))

(package
  (name "dotmatrix-fileprinter")
  (version "0.1.0")
  (source #f)
  (build-system gnu-build-system)
  (synopsis "dotmatrix-fileprinter")
  (description "dotmatrix-fileprinter — part of the hyperpolymath ecosystem.")
  (home-page "https://github.com/hyperpolymath/dotmatrix-fileprinter")
  (license ((@@ (guix licenses) license) "MPL-2.0"
             "https://github.com/hyperpolymath/palimpsest-license")))
